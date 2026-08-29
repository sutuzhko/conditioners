/**
 * Заявки. Внутренний раздел админки: на сайте не показываются нигде.
 *
 * Раздела «Заявки» в исходном дизайне не было — заявки жили только в Telegram
 * (docs/API.md, отличие 3).
 */
import type { LeadStatus, Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import type { Viewer } from '@/server/repo/day-blocks';
import { parseLeadContext } from '@/entities/lead/lib/context';
import type { LeadContext, LeadUpdate } from '@/entities/lead/model';
import { pageWindow, type Page } from '@/shared/lib/paging';
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
  managerComment: string | null;
  /** Клиент, в которого выросло обращение; `null` — в базу его ещё не завели. */
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
};

type LeadRow = Omit<LeadDto, 'status' | 'context' | 'consentAt' | 'createdAt' | 'updatedAt'> & {
  status: LeadStatus;
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
 * Запись нового обращения — заявки с сайта или напоминания о ТО.
 *
 * Клиент транзакции параметром, потому что в одиночку обращение не пишется
 * никогда: вместе с ним в очередь встаёт уведомление, и обе записи живут или
 * падают вместе (инвариант 2, ADR-091). Порядок и состав полей — забота слоя
 * сервисов (`services/leads`), здесь только доступ к данным.
 */
export async function create(
  data: Prisma.LeadCreateInput,
  client: Prisma.TransactionClient = db,
): Promise<LeadDto> {
  return toDto(await client.lead.create({ data }));
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
  params: { status?: LeadStatusApi | undefined; page?: number | undefined } = {},
): Promise<Page<LeadDto>> {
  const where = whereStatus(params.status);
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
    },
  });

  return toDto(row);
}
