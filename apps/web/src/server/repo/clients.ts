/**
 * База клиентов — внутренний раздел панели, наружу не отдаётся нигде
 * (ADR-105). Здесь адреса и телефоны людей: это ПДн, и доступ к ним есть
 * только у владельца.
 */
/* `Prisma` берётся значением: `PrismaClientKnownRequestError` — класс, по
   нему отличается гонка на уникальном ключе от любого другого сбоя. */
import { Prisma } from '@prisma/client';

import {
  type ClientCard,
  type ClientCreate,
  type ClientPage,
  type ClientUpdate,
} from '@/entities/client/model';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { pageWindow } from '@/shared/lib/paging';
import { phoneBody, phoneKey } from '@/shared/lib/phone';

const clientSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  note: true,
  createdAt: true,
  _count: { select: { leads: true } },
  /* 🔴 Наряды человека: из них считаются «Заказов», «Сумма» и «Последний» —
     три колонки списка (макет `Clients.png`).
     
     Отменённые не в счёт: за них никто не ездил и денег они не принесли, а
     сложить их в «на сумму» значит обещать выручку, которой не было. Берутся
     две колонки, а не наряды целиком: список показывает числа, а не работы. */
  orders: {
    where: { status: { not: 'CANCELLED' } },
    select: { at: true, price: true },
    orderBy: { at: 'desc' },
  },
} as const;

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  note: string | null;
  createdAt: Date;
  _count: { leads: number };
  orders: readonly { at: Date; price: number }[];
};

function toCard(row: ClientRow): ClientCard {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    leadCount: row._count.leads,
    orderCount: row.orders.length,
    orderSum: row.orders.reduce((sum, order) => sum + order.price, 0),
    lastOrderAt: row.orders[0]?.at.toISOString() ?? null,
  };
}

/**
 * Условие поиска по одной строке: имя, адрес и телефон разом.
 *
 * Телефон ищется по каноническому ключу, а не по тому, как номер записан:
 * владелец набирает «910 155», «8910» или «+7 910» — и все три обязаны найти
 * одного и того же человека. `phoneBody` снимает код страны, поэтому обрывок,
 * начатый с восьмёрки, тоже попадает в цифры номера.
 */
function searchWhere(query: string): Prisma.ClientWhereInput {
  const text = query.trim();
  if (text === '') return {};

  const digits = phoneBody(text);

  return {
    OR: [
      { name: { contains: text, mode: 'insensitive' } },
      { address: { contains: text, mode: 'insensitive' } },
      ...(digits === '' ? [] : [{ phoneKey: { contains: digits } }]),
    ],
  };
}

/**
 * Страница списка: поиск и разбивка считаются одним запросом к базе.
 *
 * Номер страницы приходит из адреса и может указывать за пределы списка —
 * например, после удаления последней записи со страницы. Такой заход
 * прижимается к последней существующей странице: пустой экран вместо списка
 * выглядит поломкой, а не концом данных.
 */
export async function list(params: {
  query?: string | undefined;
  page?: number | undefined;
}): Promise<ClientPage> {
  const where = searchWhere(params.query ?? '');
  const total = await db.client.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.client.findMany({
    where,
    select: clientSelect,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  return { items: rows.map(toCard), total, page, pages };
}

/**
 * Все клиенты для выбора в наряде.
 *
 * Без разбивки намеренно: это не список для чтения, а содержимое одного
 * `select` — страница, показавшая восемь человек из сорока, сделала бы
 * остальных недоступными для наряда. Порядок по имени: в выпадающем списке
 * ищут глазами, а не по дате появления.
 */
export async function listAll(): Promise<ClientCard[]> {
  const rows = await db.client.findMany({ select: clientSelect, orderBy: { name: 'asc' } });
  return rows.map(toCard);
}

export async function findById(id: string): Promise<ClientCard | null> {
  const row = await db.client.findUnique({ where: { id }, select: clientSelect });
  return row === null ? null : toCard(row);
}

export async function countAll(): Promise<number> {
  return db.client.count();
}

/**
 * Счёт базы для подписи раздела: сколько всего и сколько завели за месяц
 * (issue #602, макет `Clients.png`).
 *
 * Календарный месяц, а не «последние тридцать дней»: владелец сверяет эту
 * цифру с тем, что помнит про август, а не с плавающим окном.
 */
export async function counts(now: Date = new Date()): Promise<{
  readonly total: number;
  readonly fresh: number;
}> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [total, fresh] = await Promise.all([
    db.client.count(),
    db.client.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return { total, fresh };
}

/**
 * Телефон, по которому карточку уже завели.
 *
 * Отказ, а не второй карточкой с тем же номером: две записи на одного
 * человека расходятся историей работ, и через год непонятно, в какой из них
 * правда (CRM.md §3.2).
 */
async function assertPhoneFree(key: string, exceptId?: string): Promise<void> {
  const taken = await db.client.findUnique({
    where: { phoneKey: key },
    select: { id: true, name: true },
  });
  if (taken === null || taken.id === exceptId) return;

  throw new ApiException(
    'validation_error',
    `Этот телефон уже записан за клиентом «${taken.name}»`,
    'phone',
  );
}

export async function create(input: ClientCreate): Promise<ClientCard> {
  const key = phoneKey(input.phone);
  await assertPhoneFree(key);

  const row = await db.client.create({
    data: {
      name: input.name,
      phone: input.phone,
      phoneKey: key,
      address: input.address,
      note: input.note,
    },
    select: clientSelect,
  });

  return toCard(row);
}

export async function update(id: string, input: ClientUpdate): Promise<ClientCard> {
  const current = await db.client.findUnique({ where: { id }, select: { id: true } });
  if (current === null) throw new ApiException('not_found', 'Клиент не найден');

  const key = input.phone === undefined ? undefined : phoneKey(input.phone);
  if (key !== undefined) await assertPhoneFree(key, id);

  const row = await db.client.update({
    where: { id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.phone === undefined || key === undefined
        ? {}
        : { phone: input.phone, phoneKey: key }),
      ...(input.address === undefined ? {} : { address: input.address }),
      ...(input.note === undefined ? {} : { note: input.note }),
    },
    select: clientSelect,
  });

  return toCard(row);
}

/**
 * Удаление карточки.
 *
 * 🔴 Обращения при этом остаются: у заявки своё согласие на обработку и свой
 * срок хранения, и стирать её вместе с карточкой значит терять доказательство
 * согласия по 152-ФЗ. Связь заявки с клиентом обнуляется — это `SetNull` в
 * схеме, отдельного кода не требует.
 */
export async function remove(id: string): Promise<void> {
  const removed = await db.client.deleteMany({ where: { id } });
  if (removed.count === 0) throw new ApiException('not_found', 'Клиент не найден');
}

/** Что случилось при заведении клиента из обращения — это разные новости. */
export type ClientFromLead = {
  readonly client: ClientCard;
  /** `false` — номер уже был в базе, к карточке привязали ещё одно обращение. */
  readonly created: boolean;
};

/**
 * Завести клиента из обращения — или привязать обращение к тому, кто уже есть.
 *
 * 🔴 Дедупликация по телефону обязательна: половина работ приходит от
 * постоянных клиентов, и повторное обращение с того же номера не должно
 * заводить второго человека (CRM.md §3.2).
 *
 * Действие идемпотентно: повторное нажатие возвращает ту же карточку и ничего
 * не создаёт — кнопку жмут дважды чаще, чем кажется.
 */
export async function fromLead(leadId: string): Promise<ClientFromLead> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, phone: true, address: true, clientId: true },
  });
  if (lead === null) throw new ApiException('not_found', 'Заявка не найдена');

  if (lead.clientId !== null) {
    const linked = await findById(lead.clientId);
    if (linked !== null) return { client: linked, created: false };
  }

  const key = phoneKey(lead.phone);
  if (key === '') {
    throw new ApiException(
      'validation_error',
      'В обращении нет телефона — карточку клиента по нему не завести',
      'phone',
    );
  }

  /* Транзакция держит связку «карточка плюс привязка обращения»: не бывает
     заведённого клиента, к которому обращение не привязалось. Сериализации
     она не даёт — при READ COMMITTED два обращения с одного номера не найдут
     карточку оба, и второе упрётся в `phoneKey @unique`. Эту гонку разбирает
     повтор ниже. */
  const link = async (): Promise<{ id: string; created: boolean }> =>
    db.$transaction(async (tx) => {
      const existing = await tx.client.findUnique({
        where: { phoneKey: key },
        select: { id: true },
      });

      const client =
        existing ??
        (await tx.client.create({
          data: {
            name: lead.name,
            phone: lead.phone,
            phoneKey: key,
            address: lead.address,
          },
          select: { id: true },
        }));

      await tx.lead.update({ where: { id: lead.id }, data: { clientId: client.id } });

      return { id: client.id, created: existing === null };
    });

  /* Повтор при `P2002` — тот же приём, что у подбора адреса (`slug-retry`):
     второй заход находит только что заведённую карточку и привязывает
     обращение к ней. Одного достаточно — вставки во второй раз уже не будет,
     а невнятная пятисотка вместо карточки клиента стоит дороже. */
  const row = await link().catch((error: unknown) => {
    const race = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!race) throw error;

    return link();
  });

  const card = await findById(row.id);
  if (card === null) throw new ApiException('not_found', 'Клиент не найден');

  return { client: card, created: row.created };
}
