/**
 * Наряд в работе: чеклист выезда, документы и фотографии — docs/CRM.md §3.3.
 *
 * 🔴 Разграничение живёт здесь, вместе с доступом к данным, а не в разметке.
 * Монтажник работает со своим нарядом: отмечает чеклист, дописывает свои
 * пункты и грузит фото «после». Плановые поля, документы и чужие наряды ему
 * закрыты — и закрыты проверкой на сервере, а не спрятанной кнопкой
 * (docs/CRM.md §6).
 *
 * 🔴 Документы наряда — договоры с персональными данными. Публичный
 * `/api/media/{name}` для них не годится: он открыт. Файлы лежат в отдельном
 * подкаталоге тома загрузок, куда открытая отдача не дотягивается вовсе — её
 * маска имени не пропускает ни косую черту, ни `.pdf`, — а наружу они
 * выходят только через маршрут, сверяющий сессию и принадлежность наряду
 * (docs/CRM.md §9).
 */
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { docDisplayName } from '@/entities/order/lib/documents';
import type {
  OrderChecklistCard,
  OrderDocCard,
  OrderDocKind,
  OrderPhotoCard,
  PhotoStage,
} from '@/entities/order/model';
import { env } from '@/shared/config/env';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { detectImage, stripMetadata } from '@/server/uploads/image';
import { deleteStoredImage, saveImage } from '@/server/uploads/store';
import {
  applyChecklist,
  DOC_KIND_TO_DB,
  requireAccess,
  STAGE_FROM_DB,
  STAGE_TO_DB,
  toChecklistCard,
  toDocCard,
  toPhotoCard,
  type Viewer,
} from '@/server/repo/orders';

// ---------- Чеклист выезда ----------

const checklistSelect = { id: true, text: true, done: true, own: true, sort: true } as const;

async function listChecklist(orderId: string): Promise<readonly OrderChecklistCard[]> {
  const rows = await db.orderChecklistItem.findMany({
    where: { orderId },
    orderBy: { sort: 'asc' },
    select: checklistSelect,
  });

  return rows.map(toChecklistCard);
}

/**
 * Свой пункт чеклиста.
 *
 * `own: true` — не пометка авторства, а защита от пересборки: собранные из
 * наряда пункты она заменяет, дописанные человеком обязана сохранить
 * (docs/CRM.md §3.3).
 */
export async function addChecklistItem(
  orderId: string,
  viewer: Viewer,
  text: string,
): Promise<OrderChecklistCard> {
  await requireAccess(orderId, viewer);

  /* В конец списка: дописанное добавляют к собранному, а не вместо него. */
  const last = await db.orderChecklistItem.findFirst({
    where: { orderId },
    orderBy: { sort: 'desc' },
    select: { sort: true },
  });

  const row = await db.orderChecklistItem.create({
    data: { orderId, text, own: true, sort: (last?.sort ?? -1) + 1 },
    select: checklistSelect,
  });

  return toChecklistCard(row);
}

/** Отметка при сборах. Отмечает и владелец, и монтажник — это общий список. */
export async function setChecklistDone(
  orderId: string,
  itemId: string,
  viewer: Viewer,
  done: boolean,
): Promise<OrderChecklistCard> {
  await requireAccess(orderId, viewer);

  /* Номер пункта приходит из адреса: без сверки с нарядом отметка ушла бы в
     чужой чеклист по чужому номеру. */
  const found = await db.orderChecklistItem.findFirst({
    where: { id: itemId, orderId },
    select: { id: true },
  });
  if (found === null) throw new ApiException('not_found', 'Пункт не найден');

  const row = await db.orderChecklistItem.update({
    where: { id: itemId },
    data: { done },
    select: checklistSelect,
  });

  return toChecklistCard(row);
}

/**
 * 🔴 Удаляются только дописанные пункты.
 *
 * Собранный из наряда пункт удалить нельзя ни владельцу, ни монтажнику: он
 * вернётся первой же пересборкой, и «удаление», которое ничего не удаляет,
 * хуже отказа. Не нужен пункт — меняется наряд, из которого он взялся.
 */
export async function removeChecklistItem(
  orderId: string,
  itemId: string,
  viewer: Viewer,
): Promise<void> {
  await requireAccess(orderId, viewer);

  const found = await db.orderChecklistItem.findFirst({
    where: { id: itemId, orderId },
    select: { own: true },
  });
  if (found === null) throw new ApiException('not_found', 'Пункт не найден');

  if (!found.own) {
    throw new ApiException(
      'forbidden',
      'Этот пункт собран из наряда — уберите его правкой наряда, а не из списка',
    );
  }

  await db.orderChecklistItem.delete({ where: { id: itemId } });
}

/**
 * Пересборка чеклиста по данным наряда.
 *
 * Расчёт тот же, что при заведении и правке (`applyChecklist`): отметки и
 * дописанные пункты сохраняются, исчезнувшее из наряда уходит.
 */
export async function rebuildChecklist(
  orderId: string,
  viewer: Viewer,
): Promise<readonly OrderChecklistCard[]> {
  await requireAccess(orderId, viewer);

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      type: true,
      heightWorks: true,
      payment: true,
      price: true,
      units: {
        select: {
          equip: true,
          model: true,
          source: true,
          trassaM: true,
          diameter: true,
          shtrob: true,
        },
        orderBy: { sort: 'asc' },
      },
    },
  });
  if (order === null) throw new ApiException('not_found', 'Наряд не найден');

  await db.$transaction((tx) => applyChecklist(tx, order));

  return listChecklist(orderId);
}

// ---------- Документы ----------

/**
 * 🔴 Подкаталог документов внутри тома загрузок.
 *
 * Открытая отдача `/api/media/{name}` собирает путь из одного имени и
 * проверяет его маской сгенерированных имён: ни косой черты, ни расширения
 * `.pdf` она не пропускает. Поэтому всё, что лежит здесь, из открытого
 * маршрута недостижимо в принципе, а не по договорённости.
 */
const DOCS_SUBDIR = 'orders';

/** Что принимаем документом: скан или PDF. Ничего исполняемого. */
type DocKind = { readonly ext: 'pdf' | 'jpg' | 'png' | 'webp'; readonly mime: string };

const PDF: DocKind = { ext: 'pdf', mime: 'application/pdf' };

const DOC_MIME: Readonly<Record<string, string>> = {
  pdf: PDF.mime,
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const PDF_SIGNATURE = '%PDF-';

function megabytes(bytes: number): string {
  return `${Math.round((bytes / 1_048_576) * 10) / 10} МБ`;
}

function wrongDocType(): ApiException {
  return new ApiException(
    'validation_error',
    'Документ принимается в PDF или снимком в JPEG, PNG и WebP',
    'file',
  );
}

/**
 * Тип определяется по сигнатуре файла, а не по расширению и не по заголовку
 * от клиента: переименованный скрипт не должен попасть на диск.
 *
 * У снимка договора вдобавок вырезаются метаданные — фотография бумаги на
 * кухне у клиента несёт GPS-координаты так же, как любая другая.
 */
function readDocument(original: Buffer): { readonly kind: DocKind; readonly bytes: Buffer } {
  if (original.subarray(0, PDF_SIGNATURE.length).toString('latin1') === PDF_SIGNATURE) {
    return { kind: PDF, bytes: original };
  }

  const image = detectImage(original);
  if (image === null) throw wrongDocType();

  return {
    kind: { ext: image.ext, mime: image.mime },
    bytes: stripMetadata(original, image.format, 'file'),
  };
}

/** Имя файла на диске всегда сгенерировано нами — всё остальное к диску не подпускаем. */
export function isSafeDocFilename(name: string): boolean {
  return /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(name);
}

function docsDir(): string {
  return join(env.UPLOADS_DIR, DOCS_SUBDIR);
}

async function saveDocumentFile(file: File): Promise<{ filename: string; size: number }> {
  if (file.size === 0) throw new ApiException('validation_error', 'Файл пустой', 'file');

  if (file.size > env.UPLOAD_MAX_BYTES) {
    throw new ApiException(
      'payload_too_large',
      `Файл больше ${megabytes(env.UPLOAD_MAX_BYTES)}. Уменьшите его и приложите ещё раз`,
      'file',
    );
  }

  const { kind, bytes } = readDocument(Buffer.from(await file.arrayBuffer()));

  const filename = `${randomUUID()}.${kind.ext}`;
  await mkdir(docsDir(), { recursive: true });
  await writeFile(join(docsDir(), filename), bytes);

  return { filename, size: bytes.length };
}

/**
 * Приём документа. Только владелец: договоры и акты подписывает он.
 *
 * Файл уже на диске, а записи о нём ещё нет — упала вставка, и снимок
 * остаётся сиротой, которого больше никто не найдёт. Публичные формы так за
 * собой убирают давно (ADR-091), приложения к наряду не исключение.
 */
export async function addDocument(
  orderId: string,
  kind: OrderDocKind,
  name: string | null,
  file: File,
): Promise<OrderDocCard> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (order === null) throw new ApiException('not_found', 'Наряд не найден');

  const stored = await saveDocumentFile(file);

  const row = await db.orderDocument
    .create({
      data: {
        orderId,
        kind: DOC_KIND_TO_DB[kind],
        name: docDisplayName(name ?? file.name),
        /* В `url` лежит имя файла на диске, а не адрес: наружу документ
           выходит только закрытым маршрутом, и адрес ему собирает проекция. */
        url: stored.filename,
        sizeBytes: stored.size,
      },
      select: { id: true, kind: true, name: true, url: true, sizeBytes: true, createdAt: true },
    })
    .catch(async (error: unknown) => {
      await rm(join(docsDir(), stored.filename), { force: true });
      throw error;
    });

  return toDocCard(orderId, row);
}

/** Удаление документа. Только владелец: это его бумаги и его ответственность. */
export async function removeDocument(orderId: string, docId: string): Promise<void> {
  const row = await db.orderDocument.findFirst({
    where: { id: docId, orderId },
    select: { id: true, url: true },
  });
  if (row === null) throw new ApiException('not_found', 'Документ не найден');

  await db.orderDocument.delete({ where: { id: row.id } });

  /* Файл уходит следом за записью: без этого том постепенно наполняется
     договорами удалённых нарядов, а найти их будет уже нечем. */
  if (isSafeDocFilename(row.url)) await rm(join(docsDir(), row.url), { force: true });
}

export type DocumentFile = {
  readonly path: string;
  readonly mime: string;
  readonly name: string;
  readonly sizeBytes: number;
};

/**
 * 🔴 Выдача документа: сессия и принадлежность наряду проверяются здесь.
 *
 * `requireAccess` сужает наряд до доступного смотрящему — монтажник получает
 * файлы только своего наряда, чужой не существует для него и здесь. Дальше
 * документ ищется **внутри этого наряда**: номера документов у всех нарядов
 * из одного пространства, и без второй половины проверки чужой договор
 * открывался бы по прямой ссылке (docs/CRM.md §9).
 */
export async function findDocumentFile(
  orderId: string,
  docId: string,
  viewer: Viewer,
): Promise<DocumentFile> {
  await requireAccess(orderId, viewer);

  const row = await db.orderDocument.findFirst({
    where: { id: docId, orderId },
    select: { name: true, url: true, sizeBytes: true },
  });
  if (row === null) throw new ApiException('not_found', 'Документ не найден');

  if (!isSafeDocFilename(row.url)) throw new ApiException('not_found', 'Документ не найден');

  const ext = row.url.slice(row.url.lastIndexOf('.') + 1);

  return {
    path: join(docsDir(), row.url),
    /* Тип берётся из расширения, которое поставил сервер при сохранении, а не
       из заголовка загрузки: клиент про этот файл больше ничего не решает. */
    mime: DOC_MIME[ext] ?? PDF.mime,
    name: row.name,
    sizeBytes: row.sizeBytes,
  };
}

// ---------- Фотографии ----------

const photoSelect = { id: true, stage: true, url: true, sort: true } as const;

/**
 * 🔴 Кто снимает какой этап.
 *
 * «До» — место установки: снимает владелец перед выездом, монтажник смотрит.
 * «После» — выполненные работы: снимает монтажник, снимок остаётся в истории
 * клиента (docs/CRM.md §6). Автора у снимка в схеме нет, и правило держится
 * на этапе, а не на подписи: чужие фото «до» монтажник не тронет потому, что
 * этот этап ему закрыт целиком.
 */
function assertStageAllowed(stage: PhotoStage, viewer: Viewer): void {
  if (viewer.role === 'owner' || stage === 'after') return;

  throw new ApiException('forbidden', 'Фото места установки загружает владелец');
}

export async function addPhoto(
  orderId: string,
  stage: PhotoStage,
  viewer: Viewer,
  file: File,
): Promise<OrderPhotoCard> {
  await requireAccess(orderId, viewer);
  assertStageAllowed(stage, viewer);

  const last = await db.orderPhoto.findFirst({
    where: { orderId, stage: STAGE_TO_DB[stage] },
    orderBy: { sort: 'desc' },
    select: { sort: true },
  });

  /* Общий приём изображений: имя генерируется, тип проверяется по сигнатуре,
     метаданные вырезаются, снимок с телефона пережимается (ADR-091). */
  const stored = await saveImage(file, 'photo');

  const row = await db.orderPhoto
    .create({
      data: {
        orderId,
        stage: STAGE_TO_DB[stage],
        url: stored.url,
        sort: (last?.sort ?? -1) + 1,
      },
      select: photoSelect,
    })
    .catch(async (error: unknown) => {
      await deleteStoredImage(stored.url);
      throw error;
    });

  return toPhotoCard(row);
}

export async function removePhoto(orderId: string, photoId: string, viewer: Viewer): Promise<void> {
  await requireAccess(orderId, viewer);

  const row = await db.orderPhoto.findFirst({
    where: { id: photoId, orderId },
    select: { id: true, stage: true, url: true },
  });
  if (row === null) throw new ApiException('not_found', 'Фото не найдено');

  assertStageAllowed(STAGE_FROM_DB[row.stage], viewer);

  await db.orderPhoto.delete({ where: { id: row.id } });
  await deleteStoredImage(row.url);
}
