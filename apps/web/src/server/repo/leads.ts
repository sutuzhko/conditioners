/**
 * Заявки. Внутренний раздел админки: на сайте не показываются нигде.
 *
 * Раздела «Заявки» в исходном дизайне не было — заявки жили только в Telegram
 * (docs/API.md, отличие 3).
 */
import { z } from 'zod';

import type { LeadStatus, Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import type { Viewer } from '@/server/repo/day-blocks';
import { parseLeadContext } from '@/entities/lead/lib/context';
import type { LeadContext, LeadUpdate } from '@/entities/lead/model';
import { isCancelReason, type CancelReason } from '@/shared/lib/cancel-reason';
import { pageWindow, type Page } from '@/shared/lib/paging';
import { phoneBody } from '@/shared/lib/phone';
import { mimeFor, resolveProtectedPath } from '@/server/uploads/store';

export type LeadStatusApi = 'new' | 'in_progress' | 'done' | 'rejected';

const TO_DB: Record<LeadStatusApi, LeadStatus> = {
  new: 'NEW',
  in_progress: 'IN_PROGRESS',
  done: 'DONE',
  rejected: 'REJECTED',
};

const FROM_DB: Record<LeadStatus, LeadStatusApi> = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  REJECTED: 'rejected',
};

export type LeadDto = {
  id: string;
  /**
   * Номер обращения — то, чем на него ссылаются вслух и в заметках. Сквозной
   * счётчик, как у наряда (ADR-114): дыр в нумерации быть не должно.
   */
  number: number;
  name: string;
  phone: string;
  topic: string;
  /**
   * Модель, ради которой человек нажал кнопку, — то, что он видел в поле формы
   * и подтвердил (ADR-129). Не путать с `context.model`: там снимок того, с
   * какой карточки пришли, здесь — подтверждённое человеком значение.
   */
  model: string | null;
  place: string | null;
  qty: string | null;
  callTime: string | null;
  address: string | null;
  comment: string | null;
  /**
   * 🔴 Адрес закрытой выдачи снимка, а не имя файла на диске (ADR-171).
   * Снимок при заявке — это интерьер квартиры клиента, и отдаётся он только
   * по сессии владельца.
   */
  photo: string | null;
  sourceUrl: string | null;
  referrer: string | null;
  utm: Prisma.JsonValue;
  /**
   * Что человек делал на сайте до отправки. Уже разобранный снимок, а не сырой
   * `Json`: колонка ничем не типизирована, и разбирать её заново в каждой
   * карточке значило бы завести три копии одних и тех же правил.
   */
  context: LeadContext | null;
  consentAt: string;
  status: LeadStatusApi;
  /**
   * Почему отказались (ADR-310). Заполнено только у отменённых обращений: у
   * остальных объяснять нечего, и `null` здесь — рабочее состояние.
   */
  cancelReason: CancelReason | null;
  cancelNote: string | null;
  managerComment: string | null;
  /** Клиент, в которого выросло обращение; `null` — в базу его ещё не завели. */
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
};

type LeadRow = Omit<
  LeadDto,
  'status' | 'context' | 'consentAt' | 'createdAt' | 'updatedAt' | 'cancelReason'
> & {
  status: LeadStatus;
  cancelReason: string | null;
  context: Prisma.JsonValue;
  consentAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * 🔴 Адрес снимка заявки — закрытый, по образцу документов наряда.
 *
 * В колонке лежит имя файла: снимок хранится в закрытом подкаталоге, куда
 * публичный `/api/media/{name}` не дотягивается (ADR-171).
 */
export function leadPhotoUrl(leadId: string): string {
  return `/api/admin/leads/${leadId}/photo`;
}

function toDto(row: LeadRow): LeadDto {
  return {
    ...row,
    photo: row.photo === null ? null : leadPhotoUrl(row.id),
    status: FROM_DB[row.status],
    /* Код причины лежит в колонке строкой, и в ней может быть значение,
       записанное вчерашним словарём. Незнакомое — то же самое, что причины
       нет: показывать владельцу чужой код бессмысленно. */
    cancelReason:
      row.cancelReason !== null && isCancelReason(row.cancelReason) ? row.cancelReason : null,
    /* Снимок разбирается на выходе из базы: в колонке лежит то, что записали
       вчерашней версией схемы, и доверять ей на слово нельзя. Не разобралось —
       контекста нет, заявка от этого не перестаёт быть заявкой. */
    context: parseLeadContext(row.context),
    consentAt: row.consentAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function whereStatus(status?: LeadStatusApi): Prisma.LeadWhereInput {
  return status === undefined ? {} : { status: TO_DB[status] };
}

/**
 * Поиск по очереди: имя, телефон, адрес и номер обращения.
 *
 * Телефон ищется по цифрам, а не по тому, как номер записан: в колонке лежит
 * канонический `+79101552468`, а владелец набирает «910 155» или «8 910» —
 * `phoneBody` снимает код страны и приводит оба обрывка к одному виду. Тот же
 * приём, что в поиске по клиентам (ADR-105).
 *
 * Номер обращения ищется точным совпадением: «41» — это заявка № 41, а не
 * всякая, где сорок первый попался внутри адреса.
 */
function searchWhere(query: string): Prisma.LeadWhereInput {
  const text = query.trim();
  if (text === '') return {};

  const digits = phoneBody(text);
  const number = /^\d{1,9}$/.test(text) ? Number.parseInt(text, 10) : null;

  return {
    OR: [
      { name: { contains: text, mode: 'insensitive' } },
      { address: { contains: text, mode: 'insensitive' } },
      { topic: { contains: text, mode: 'insensitive' } },
      ...(digits === '' ? [] : [{ phone: { contains: digits } }]),
      ...(number === null ? [] : [{ number }]),
    ],
  };
}

/**
 * Запись нового обращения — заявки с сайта или напоминания о ТО.
 *
 * Клиент транзакции параметром, потому что в одиночку обращение не пишется
 * никогда: вместе с ним в очередь встаёт уведомление, и обе записи живут или
 * падают вместе (инвариант 2, ADR-091). Порядок и состав полей — забота слоя
 * сервисов (`services/leads`), здесь только доступ к данным.
 */
export async function create(
  data: Omit<Prisma.LeadCreateInput, 'number'>,
  client: Prisma.TransactionClient = db,
): Promise<LeadDto> {
  return toDto(await client.lead.create({ data: { ...data, number: await nextNumber(client) } }));
}

/** Ключ счётчика номеров обращений в `Setting` — по образцу нарядов. */
const LEAD_SEQ_KEY = 'leadSeq';

/**
 * Первое обращение — № 1.
 *
 * Начинать с сотни, чтобы «выглядело солиднее», нельзя ровно по той же
 * причине, что и у наряда (ADR-114): номер называют вслух, и он сообщал бы о
 * работе, которой не было (инвариант 10). Владельцу, продолжающему нумерацию
 * бумажного журнала, кода менять не нужно — стартовое значение задаётся
 * записью в `Setting`.
 */
const FIRST_LEAD_NUMBER = 1;

/** Значение из `Setting` приходит как JSON — доверять ему без проверки нельзя. */
const leadSeqSchema = z.number().int().min(0);

/**
 * 🔴 Номер выдаётся в той же транзакции, что и вставка обращения.
 *
 * Автоинкремент Postgres не годится: он оставляет дыру на каждой откатанной
 * транзакции. Заявка пишется вместе с уведомлением о ней (инвариант 2,
 * ADR-091), и откат этой пары — обычное дело при недоступной очереди.
 */
async function nextNumber(tx: Prisma.TransactionClient): Promise<number> {
  const row = await tx.setting.findUnique({ where: { key: LEAD_SEQ_KEY } });
  const stored = leadSeqSchema.safeParse(row?.value);
  const number = stored.success ? stored.data + 1 : FIRST_LEAD_NUMBER;

  await tx.setting.upsert({
    where: { key: LEAD_SEQ_KEY },
    create: { key: LEAD_SEQ_KEY, value: number },
    update: { value: number },
  });

  return number;
}

/**
 * Страница списка заявок.
 *
 * 🔴 С `take`, а не «все за всё время»: за годы работы список вырастает без
 * потолка, и запрос без границы однажды кладёт панель вместе с базой. Номер
 * страницы приходит из адреса и может указывать за пределы списка — тогда он
 * прижимается к последней существующей (`pageWindow`).
 */
export async function listByStatus(
  params: {
    status?: LeadStatusApi | undefined;
    page?: number | undefined;
    query?: string | undefined;
  } = {},
): Promise<Page<LeadDto>> {
  const where: Prisma.LeadWhereInput = {
    ...whereStatus(params.status),
    ...searchWhere(params.query ?? ''),
  };
  const total = await db.lead.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  return { items: rows.map(toDto), total, page, pages };
}

/**
 * Сколько заявок в статусе. Сводка панели показывает число новых, и тянуть
 * ради него все записи в память незачем.
 */
export async function countByStatus(status?: LeadStatusApi): Promise<number> {
  return db.lead.count({ where: whereStatus(status) });
}

/**
 * Заявки за промежуток — ими календарь заполняет дни обращений.
 *
 * Отдельно от `listByStatus`: календарю нужен месяц, а не весь список, и
 * тянуть в память все заявки за годы ради одной сетки незачем.
 *
 * 🔴 Обращения монтажнику закрыты целиком (CRM.md §6), поэтому в его календарь
 * они не попадают вовсе — и запрос за ними не уходит: заявка везёт имя,
 * телефон и тему, и отбрасывать её уже после выборки поздно.
 */
export async function listCreatedBetween(viewer: Viewer, from: Date, to: Date): Promise<LeadDto[]> {
  if (viewer.role === 'installer') return [];

  const rows = await db.lead.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toDto);
}

export async function findById(id: string): Promise<LeadDto | null> {
  const row = await db.lead.findUnique({ where: { id } });
  return row === null ? null : toDto(row);
}

export type LeadPhotoFile = { readonly path: string; readonly mime: string };

/**
 * 🔴 Выдача снимка заявки: путь собирается здесь, а не в обработчике.
 *
 * В колонке лежит имя файла, сгенерированное сервером; `resolveProtectedPath`
 * пропускает только такое имя, поэтому выйти за закрытый подкаталог по нему
 * нельзя. Сессию проверяет `withOwner` на маршруте — заявки видит только
 * владелец.
 */
export async function findPhotoFile(id: string): Promise<LeadPhotoFile> {
  const row = await db.lead.findUnique({ where: { id }, select: { photo: true } });
  if (row === null || row.photo === null) throw new ApiException('not_found', 'Фото не найдено');

  const path = resolveProtectedPath(row.photo);
  if (path === null) throw new ApiException('not_found', 'Фото не найдено');

  return { path, mime: mimeFor(row.photo) };
}

/**
 * Обращения одного клиента — история разговора с человеком в его карточке.
 *
 * Связь берётся по `clientId`, а не подбором по телефону: номер клиента
 * правится, и история, склеенная по совпадению строк, разъехалась бы при
 * первой же правке (ADR-105).
 */
export async function listByClient(clientId: string): Promise<LeadDto[]> {
  const rows = await db.lead.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

/**
 * Обращение уходит в работу: по нему заводят наряд (CRM.md §3.4).
 *
 * 🔴 Двигается только новая заявка. Завершённую или отклонённую заказ в работу
 * не возвращает: статус — решение менеджера, и молча переписывать его действие
 * значит врать ему о том, что он видел вчера. Отсюда же идемпотентность —
 * второе нажатие ничего не меняет.
 */
export async function startWork(id: string): Promise<LeadDto> {
  const lead = await db.lead.findUnique({ where: { id } });
  if (lead === null) throw new ApiException('not_found', 'Заявка не найдена');

  if (lead.status !== 'NEW') return toDto(lead);

  return toDto(await db.lead.update({ where: { id }, data: { status: 'IN_PROGRESS' } }));
}

/** Менеджер меняет статус и оставляет комментарий; данные клиента не правятся. */
export async function update(id: string, input: LeadUpdate): Promise<LeadDto> {
  const exists = await db.lead.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Заявка не найдена');

  const row = await db.lead.update({
    where: { id },
    data: {
      ...(input.status === undefined ? {} : { status: TO_DB[input.status] }),
      ...(input.managerComment === undefined ? {} : { managerComment: input.managerComment }),
      ...cancelData(input),
    },
  });

  return toDto(row);
}

/**
 * Что происходит с разбором отказа при смене статуса (ADR-310).
 *
 * 🔴 Возврат обращения из отказа стирает причину. Схема не даёт прислать её
 * вместе с другим статусом, но старая запись осталась бы в колонке и врала:
 * «в работе, отказались потому что дорого». Стирается и уточнение — оно
 * объясняло причину, которой больше нет.
 */
function cancelData(input: LeadUpdate): Prisma.LeadUpdateInput {
  if (input.cancelReason !== undefined) {
    return { cancelReason: input.cancelReason, cancelNote: input.cancelNote ?? null };
  }

  return input.status === undefined || input.status === 'rejected'
    ? {}
    : { cancelReason: null, cancelNote: null };
}

/**
 * 🔴 Уничтожение обращения — исполнение требования 152-ФЗ (issue #600).
 *
 * В заявке лежат имя, телефон, адрес, комментарий и снимок комнаты — тот же
 * состав персональных данных, что в карточке клиента, где удаление есть с
 * самого начала. Закон требует уметь их уничтожить по требованию человека, и
 * до этой правки владелец такой возможности не имел вовсе.
 *
 * Отменённое и удалённое — разные вещи: отмена оставляет обращение в истории
 * и в счётчиках, удаление не оставляет ничего. Второе необратимо, поэтому
 * спрашивает подтверждение (ADR-113), а наряд, выросший из обращения, при
 * этом остаётся — связь помечена `SetNull`: удалённая заявка не отменяет
 * работу, о которой уже договорились.
 *
 * Возвращается имя файла снимка: удалить его с диска — забота сервиса, у
 * репозитория нет доступа к хранилищу.
 */
export async function remove(id: string): Promise<{ readonly photo: string | null }> {
  const row = await db.lead.findUnique({ where: { id }, select: { photo: true } });
  if (row === null) throw new ApiException('not_found', 'Заявка не найдена');

  await db.lead.delete({ where: { id } });

  return { photo: row.photo };
}

/**
 * Счёт очереди для подписи раздела: сколько новых и сколько из них ждут
 * дольше суток.
 *
 * 🔴 Считается в базе, а не по текущей странице очереди: на экране восемь
 * строк, а залежавшееся обращение лежит на четвёртой странице — именно поэтому
 * оно и залежалось.
 */
export type LeadQueueCounts = {
  readonly total: number;
  readonly fresh: number;
  readonly stale: number;
  /** Самое старое непринятое обращение — то, ради которого висит плашка. */
  readonly oldest: {
    readonly id: string;
    readonly number: number;
    readonly createdAt: string;
  } | null;
};

/** Сутки без ответа — граница, после которой обращение считается залежавшимся. */
export const LEAD_STALE_HOURS = 24;

export async function queueCounts(now: Date = new Date()): Promise<LeadQueueCounts> {
  const staleBefore = new Date(now.getTime() - LEAD_STALE_HOURS * 60 * 60 * 1000);
  const fresh: Prisma.LeadWhereInput = { status: TO_DB.new };

  const [total, freshCount, stale, oldest] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: fresh }),
    db.lead.count({ where: { ...fresh, createdAt: { lt: staleBefore } } }),
    db.lead.findFirst({
      where: { ...fresh, createdAt: { lt: staleBefore } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, number: true, createdAt: true },
    }),
  ]);

  return {
    total,
    fresh: freshCount,
    stale,
    oldest:
      oldest === null
        ? null
        : {
            id: oldest.id,
            number: oldest.number,
            createdAt: oldest.createdAt.toISOString(),
          },
  };
}
