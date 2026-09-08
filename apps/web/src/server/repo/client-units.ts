/**
 * Техника клиента — docs/API.md §12, разбор — docs/CRM.md §3.2, §8.4, §8.8.
 *
 * Список того, что у человека стоит, отвечает сразу на три вопроса: гарантийный
 * это случай или платный ремонт, когда звать на ТО и что человеку уже продали.
 * Раздел владельца целиком, как и вся база клиентов: здесь адреса и история
 * работ, а монтажник получает адрес только со своим нарядом (ADR-105).
 *
 * 🔴 Записи заводятся сами из выполненного монтажа — руками добавляют только
 * то, что поставили до этой системы или не мы. Ручной ввод остаётся, потому
 * что половина клиентов пришла с уже стоящим оборудованием.
 */
import type { OrderEquip, Prisma, UnitSource } from '@prisma/client';

import { dayOf, unitsToCreate, warrantyEndDay, warrantyMonths } from '@/entities/client/lib/units';
import type { ClientUnitCard, ClientUnitCreate, ClientUnitUpdate } from '@/entities/client/model';
import { warrantySchema } from '@/entities/settings/model';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { mimeFor, protectedImageExists, resolveProtectedPath } from '@/server/uploads/store';
import { momentOf } from '@/shared/lib/calendar';

const unitSelect = {
  id: true,
  clientId: true,
  model: true,
  installedAt: true,
  warrantyUntil: true,
  photo: true,
  orderId: true,
} as const;

type UnitRow = {
  id: string;
  clientId: string;
  model: string;
  installedAt: Date;
  warrantyUntil: Date | null;
  photo: string | null;
  orderId: string | null;
};

/**
 * 🔴 Адрес снимка установки — закрытый, как у заявки и у наряда (ADR-171).
 *
 * В колонке лежит **имя файла**: снимок «после» живёт в закрытом подкаталоге,
 * куда публичный `/api/media/{name}` не дотягивается. До issue #868 карточка
 * получала это имя как есть, и в `<Image src>` уезжал относительный путь без
 * ведущей косой черты — `next/image` бросал на нём исключение. Адрес
 * собирается тем же способом, что у снимка наряда (`toPhotoCard`): по номерам
 * записей, а не по имени файла на томе.
 */
export function clientUnitPhotoUrl(clientId: string, unitId: string): string {
  return `/api/admin/clients/${clientId}/units/${unitId}/photo`;
}

/**
 * Дата — это день, а не момент: час установки никого не интересует, а
 * гарантия «до 14 июля» действует весь день четырнадцатого. Полночь берётся
 * московская — работа идёт в Туле, а не в поясе того, кто смотрит.
 */
function momentOfDay(day: string): Date {
  return momentOf(day, '00:00');
}

/**
 * Карточка записи.
 *
 * 🔴 Дожил ли снимок до сегодня, спрашивает сервер, а не браузер (issue #690,
 * #868). Имя файла есть прямо здесь, в строке базы, — отдельного запроса
 * проверка не стоит, а карточка приходит уже верной: значку сломанной
 * картинки взяться неоткуда (инвариант 1). Проверяется закрытое хранилище:
 * публичная проверка `mediaExists` ждёт адрес с префиксом `/api/media` и на
 * любое имя файла честно отвечает «нет» — то есть показывала бы «файла нет»
 * там, где файл на месте.
 */
async function toCard(row: UnitRow, numbers: ReadonlyMap<string, number>): Promise<ClientUnitCard> {
  const number = row.orderId === null ? undefined : numbers.get(row.orderId);
  const photo = row.photo;

  return {
    id: row.id,
    model: row.model,
    installedAt: row.installedAt.toISOString(),
    warrantyUntil: row.warrantyUntil?.toISOString() ?? null,
    photo: photo === null ? null : clientUnitPhotoUrl(row.clientId, row.id),
    ...(photo === null ? {} : { photoMissing: !(await protectedImageExists(photo)) }),
    /* Наряд мог быть удалён: у `orderId` нет внешнего ключа намеренно —
       удалённый наряд не отменяет того, что кондиционер у человека висит. */
    order: row.orderId === null || number === undefined ? null : { id: row.orderId, number },
  };
}

/** Номера нарядов одним запросом: карточка ссылается на них, а не на `id`. */
async function orderNumbers(rows: readonly UnitRow[]): Promise<ReadonlyMap<string, number>> {
  const ids = [...new Set(rows.flatMap((row) => (row.orderId === null ? [] : [row.orderId])))];
  if (ids.length === 0) return new Map();

  const orders = await db.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, number: true },
  });

  return new Map(orders.map((order) => [order.id, order.number]));
}

async function cardOf(row: UnitRow): Promise<ClientUnitCard> {
  return await toCard(row, await orderNumbers([row]));
}

/**
 * Что стоит у клиента. Свежее сверху: последний монтаж вспоминают чаще, чем
 * позапрошлогодний.
 */
export async function listByClient(clientId: string): Promise<readonly ClientUnitCard[]> {
  const rows = await db.clientUnit.findMany({
    where: { clientId },
    select: unitSelect,
    orderBy: { installedAt: 'desc' },
  });

  const numbers = await orderNumbers(rows);
  return await Promise.all(rows.map(async (row) => await toCard(row, numbers)));
}

async function assertClient(clientId: string): Promise<void> {
  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (client === null) throw new ApiException('not_found', 'Клиент не найден');
}

/**
 * Запись руками: техника, поставленная до этой системы или не нами.
 *
 * Наряд к такой записи не привязывается: его не было. Фотография тоже —
 * снимок берётся из фото «после» выполненного наряда, а придумать его неоткуда.
 */
export async function create(clientId: string, input: ClientUnitCreate): Promise<ClientUnitCard> {
  await assertClient(clientId);

  const row = await db.clientUnit.create({
    data: {
      clientId,
      model: input.model,
      installedAt: momentOfDay(input.installedAt),
      warrantyUntil: input.warrantyUntil === null ? null : momentOfDay(input.warrantyUntil),
    },
    select: unitSelect,
  });

  return cardOf(row);
}

/**
 * Правка записи.
 *
 * Номер записи сверяется с клиентом: без этого чужую технику можно было бы
 * править по угаданному номеру, зная только своего клиента.
 */
export async function update(
  clientId: string,
  id: string,
  input: ClientUnitUpdate,
): Promise<ClientUnitCard> {
  const found = await db.clientUnit.findFirst({ where: { id, clientId }, select: { id: true } });
  if (found === null) throw new ApiException('not_found', 'Запись о технике не найдена');

  const row = await db.clientUnit.update({
    where: { id },
    data: {
      ...(input.model === undefined ? {} : { model: input.model }),
      ...(input.installedAt === undefined ? {} : { installedAt: momentOfDay(input.installedAt) }),
      ...(input.warrantyUntil === undefined
        ? {}
        : {
            warrantyUntil: input.warrantyUntil === null ? null : momentOfDay(input.warrantyUntil),
          }),
    },
    select: unitSelect,
  });

  return cardOf(row);
}

/**
 * Удаление записи.
 *
 * Файл снимка при этом остаётся: он принадлежит наряду, из которого техника
 * выросла, и в карточке наряда он тоже показан. Удалять чужое фото, убирая
 * запись о технике, — потерять его в двух местах вместо одного.
 */
export async function remove(clientId: string, id: string): Promise<void> {
  const removed = await db.clientUnit.deleteMany({ where: { id, clientId } });
  if (removed.count === 0) throw new ApiException('not_found', 'Запись о технике не найдена');
}

export type ClientUnitPhotoFile = { readonly path: string; readonly mime: string };

/**
 * 🔴 Выдача снимка установки: путь собирается здесь, а не в обработчике.
 *
 * Номер записи сверяется с клиентом — по той же причине, что и в правке:
 * иначе чужой снимок открывался бы по угаданному номеру, зная только своего
 * клиента. В колонке лежит имя файла, сгенерированное сервером, и
 * `resolveProtectedPath` пропускает только такое имя: выйти им за закрытый
 * подкаталог нельзя. Сессию проверяет `withOwner` на маршруте — база клиентов
 * принадлежит владельцу целиком (ADR-105).
 */
export async function findPhotoFile(clientId: string, id: string): Promise<ClientUnitPhotoFile> {
  const row = await db.clientUnit.findFirst({
    where: { id, clientId },
    select: { photo: true },
  });
  if (row === null || row.photo === null) throw new ApiException('not_found', 'Фото не найдено');

  const path = resolveProtectedPath(row.photo);
  if (path === null) throw new ApiException('not_found', 'Фото не найдено');

  return { path, mime: mimeFor(row.photo) };
}

/* ---------- Техника из выполненного монтажа ---------- */

/** Подпись позиции без модели: что-то же у человека стоит. */
const EQUIP_TITLES: Readonly<Record<OrderEquip, string>> = {
  CONDITIONER: 'Кондиционер',
  FRIDGE: 'Холодильник',
  COMPRESSOR: 'Компрессор',
  VENTILATION: 'Вентиляция',
  HEAT_CURTAIN: 'Тепловая завеса',
  OTHER: 'Оборудование',
};

type OrderPosition = { model: string | null; equip: OrderEquip; source: UnitSource };

function positionName(position: OrderPosition): string {
  const model = position.model?.trim() ?? '';
  return model === '' ? EQUIP_TITLES[position.equip] : model;
}

/**
 * Сроки гарантии из настроек компании.
 *
 * 🔴 Ни одного значения по умолчанию: срок — факт о компании (инвариант 8).
 * Настроек нет или они записаны словами, из которых даты не выходит, — техника
 * всё равно записывается, просто без гарантии. Пустая дата честнее выдуманной.
 */
async function warrantyBySource(
  client: Prisma.TransactionClient,
): Promise<Readonly<Record<UnitSource, number | null>>> {
  const row = await client.setting.findUnique({ where: { key: 'warranty' } });
  const parsed = warrantySchema.safeParse(row?.value ?? {});
  const terms = parsed.success ? parsed.data : { installation: '', equipment: '' };

  const onWorks = warrantyMonths(terms.installation);

  return {
    /* Наше оборудование: считаем по сроку на технику. Записан он
       неоднозначно — берём срок на монтаж: это тот минимум, за который
       компания отвечает при любом раскладе. */
    OURS: warrantyMonths(terms.equipment) ?? onWorks,
    /* 🔴 Техника клиента: компания продала не её, а работы, — и отвечает
       ровно за них (CRM.md §8.8). Срок на оборудование сюда не относится. */
    CLIENT: onWorks,
  };
}

export type UnitsFromOrder = {
  /** Сколько записей о технике завели этим вызовом. */
  readonly created: number;
  /** Сколько уже стояло от этого наряда: повторное закрытие дублей не плодит. */
  readonly kept: number;
  /** Записать не удалось. Наряд от этого не падает — технику добавят руками. */
  readonly failed: boolean;
};

const NOTHING: UnitsFromOrder = { created: 0, kept: 0, failed: false };

/**
 * 🔴 Техника клиента появляется сама из выполненного монтажа (CRM.md §3.2).
 *
 * Зовётся при переходе наряда в «выполнен» — из той же транзакции, что и сама
 * смена статуса, поэтому принимает транзакционный клиент. Статус функция не
 * перепроверяет: на момент вызова он может быть ещё не записан, а решение
 * «работа сделана» принимает тот, кто её закрывает.
 *
 * 🔴 Не бросает никогда. Закрытие наряда — деньги и график; уронить его из-за
 * того, что не прочитались настройки гарантии, нельзя. Отказ возвращается
 * флагом, техника добавляется руками.
 *
 * Дублей не плодит: повторное закрытие сверяется с уже записанным по этому
 * наряду. Позиции с оборудованием клиента переносятся наравне со своими —
 * компания отвечает за монтаж, и через год это тот же повод позвонить, — но
 * гарантия у них считается по сроку на работы, а не на технику.
 */
export async function fromCompletedOrder(
  orderId: string,
  client: Prisma.TransactionClient = db,
): Promise<UnitsFromOrder> {
  try {
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: {
        clientId: true,
        /* Ставит ли работа этого вида технику — признак справочника, а не
           правило в коде (ADR-343): до переезда здесь стояло
           `type !== 'INSTALL'`, и новый вид работ владельца молча не заводил
           бы технику в карточке клиента. */
        workType: { select: { installsUnits: true } },
        at: true,
        units: {
          orderBy: { sort: 'asc' },
          select: { model: true, equip: true, source: true },
        },
        /* Снимок выполненных работ: его грузит монтажник, и он остаётся в
           истории клиента (CRM.md §3.3). Первый — обзорный. */
        photos: {
          where: { stage: 'AFTER' },
          orderBy: { sort: 'asc' },
          take: 1,
          select: { url: true },
        },
      },
    });

    /* Техника растёт из монтажа. ТО и ремонт ничего нового не ставят — они
       приезжают к тому, что уже стоит. Какие виды работ ставят технику,
       решает справочник, а не этот файл. */
    if (order === null || !order.workType.installsUnits || order.units.length === 0) {
      return NOTHING;
    }

    const recorded = await client.clientUnit.findMany({
      where: { orderId },
      select: { model: true },
    });

    const fresh = unitsToCreate(
      order.units,
      recorded.map((unit) => unit.model),
      positionName,
    );
    if (fresh.length === 0) return { created: 0, kept: recorded.length, failed: false };

    const months = await warrantyBySource(client);
    const installDay = dayOf(order.at);
    /* 🔴 В колонку едет имя файла, а не адрес: снимок наряда лежит в закрытом
       хранилище, и `OrderPhoto.url` с ADR-171 хранит именно имя. Адрес
       карточке собирает `clientUnitPhotoUrl` — так же, как наряду его
       собирает `toPhotoCard` (issue #868). */
    const photo = order.photos[0]?.url ?? null;

    const { count } = await client.clientUnit.createMany({
      data: fresh.map((position) => {
        const term = months[position.source];

        return {
          clientId: order.clientId,
          model: positionName(position),
          installedAt: order.at,
          warrantyUntil: term === null ? null : momentOfDay(warrantyEndDay(installDay, term)),
          photo,
          orderId,
        };
      }),
    });

    return { created: count, kept: recorded.length, failed: false };
  } catch (error) {
    /* Логом, а не исключением: наряд закрыт, деньги посчитаны, техника
       добавляется руками — это несравнимо дешевле упавшего закрытия. */
    console.error('Не удалось записать технику клиента по наряду', error);
    return { created: 0, kept: 0, failed: true };
  }
}
