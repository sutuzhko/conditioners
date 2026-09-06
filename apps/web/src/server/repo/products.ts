/**
 * Каталог. Публичное чтение отдаёт только видимые товары; админка видит всё.
 *
 * 🔴 Характеристики — произвольный упорядоченный список пар (инвариант 6):
 * порядок задаёт владелец, набор ключей у каждой модели свой.
 */
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { withSlugRetry } from '@/server/repo/slug-retry';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { pageSlug, uniqueSlug } from '@/shared/lib/slug';
import { pageWindow, type Page } from '@/shared/lib/paging';
import { ApiException } from '@/server/http';
import type { PhotoUpdate, ProductInput, ProductPatch } from '@/entities/product/model';
import type { SaleInput } from '@/entities/product/sale';

const MSK_SHIFT_MS = 3 * 60 * 60 * 1000;

export type PhotoDto = {
  id: string;
  url: string;
  alt: string | null;
  isMain: boolean;
  sort: number;
};

export type SpecDto = { k: string; v: string };

export type ProductDto = {
  id: string;
  slug: string;
  badge: string;
  name: string;
  brand: string | null;
  sku: string | null;
  areaMax: number;
  tag: string | null;
  priceNum: number;
  salePrice: number | null;
  saleFrom: string | null;
  saleTo: string | null;
  saleLabel: string | null;
  link: string | null;
  visible: boolean;
  featured: boolean;
  sort: number;
  seoTitle: string | null;
  seoDescription: string | null;
  photos: PhotoDto[];
  specs: SpecDto[];
  currentPrice: number;
  oldPrice: number | null;
  discountPercent: number;
  saleActive: boolean;
};

const withRelations = {
  // Главная фотография идёт первой: карточке и разметке нужна именно она.
  photos: { orderBy: [{ isMain: 'desc' }, { sort: 'asc' }] },
  specs: { orderBy: { sort: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: { photos: true; specs: true } }>;

/** Границы скидки владелец задаёт днями по местному времени — так их и показываем. */
function toLocalDate(date: Date | null): string | null {
  if (date === null) return null;
  return new Date(date.getTime() + MSK_SHIFT_MS).toISOString().slice(0, 10);
}

export function toDto(row: ProductRow, now: Date = new Date()): ProductDto {
  const active = getActivePrice(row, now);

  return {
    id: row.id,
    slug: row.slug,
    badge: row.badge,
    name: row.name,
    brand: row.brand,
    sku: row.sku,
    areaMax: row.areaMax,
    tag: row.tag,
    priceNum: row.priceNum,
    salePrice: row.salePrice,
    saleFrom: toLocalDate(row.saleFrom),
    saleTo: toLocalDate(row.saleTo),
    saleLabel: row.saleLabel,
    link: row.link,
    visible: row.visible,
    featured: row.featured,
    sort: row.sort,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    photos: row.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      alt: photo.alt,
      isMain: photo.isMain,
      sort: photo.sort,
    })),
    specs: row.specs.map((spec) => ({ k: spec.k, v: spec.v })),
    currentPrice: active.currentPrice,
    oldPrice: active.oldPrice,
    // в контракте (docs/API.md §3) поле всегда число: «нет скидки» видно по saleActive
    discountPercent: active.discountPercent ?? 0,
    saleActive: active.saleActive,
  };
}

const order = [
  { sort: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.ProductOrderByWithRelationInput[];

/** Каталог: всё, что в продаже. */
export async function listVisible(): Promise<ProductDto[]> {
  const rows = await db.product.findMany({
    where: { visible: true },
    include: withRelations,
    orderBy: order,
  });
  return rows.map((row) => toDto(row));
}

/**
 * Витрина лендинга: то, что владелец вынес на главную (ADR-109).
 *
 * 🔴 Вместе с `visible`, а не вместо него: снятая с продажи модель на главной
 * — это предложение купить то, чего нет. Признак «на главной» отвечает на
 * другой вопрос — что показать сегодня, — и снимать товар с продажи он не
 * умеет.
 */
export async function listFeatured(): Promise<ProductDto[]> {
  const rows = await db.product.findMany({
    where: { visible: true, featured: true },
    include: withRelations,
    orderBy: order,
  });
  return rows.map((row) => toDto(row));
}

export async function findVisibleBySlug(slug: string): Promise<ProductDto | null> {
  const row = await db.product.findFirst({
    where: { slug, visible: true },
    include: withRelations,
  });
  return row === null ? null : toDto(row);
}

export async function listAll(): Promise<ProductDto[]> {
  const rows = await db.product.findMany({ include: withRelations, orderBy: order });
  return rows.map((row) => toDto(row));
}

/** Что показывает список панели: только видимые, только скрытые или всё. */
export type CatalogVisibility = 'visible' | 'hidden';

/** Отбор каталога в панели: поиск, видимость и номер страницы. */
export type CatalogQuery = {
  readonly query?: string | undefined;
  readonly visibility?: CatalogVisibility | undefined;
  readonly page?: number | undefined;
};

/** Счётчики раздела: они считаются по всему каталогу, а не по странице списка. */
export type CatalogCounts = {
  readonly total: number;
  readonly visible: number;
  readonly onSale: number;
};

/**
 * Условие поиска по одной строке: название, марка, артикул и категория разом.
 *
 * Мощность в подсказке поля названа не случайно — владелец ищет «09» или
 * «12», а это категория модели (`badge`), а не отдельное поле.
 */
function catalogSearchWhere(query: string): Prisma.ProductWhereInput {
  const text = query.trim();
  if (text === '') return {};

  return {
    OR: [
      { name: { contains: text, mode: 'insensitive' } },
      { brand: { contains: text, mode: 'insensitive' } },
      { sku: { contains: text, mode: 'insensitive' } },
      { badge: { contains: text, mode: 'insensitive' } },
    ],
  };
}

function catalogWhere(params: CatalogQuery): Prisma.ProductWhereInput {
  return {
    ...catalogSearchWhere(params.query ?? ''),
    ...(params.visibility === undefined ? {} : { visible: params.visibility === 'visible' }),
  };
}

/**
 * Страница списка моделей для панели.
 *
 * 🔴 С окном, а не «все за раз» (issue #612). Восемь моделей помещаются на
 * экран, восемьдесят — нет, и запрос без границы однажды отдаёт всю базу
 * вместе с фотографиями и характеристиками каждой строки.
 *
 * Порядок тот же, что на сайте: список панели и есть порядок витрины, и
 * второй сортировки у него быть не должно.
 */
export async function listAdmin(params: CatalogQuery = {}): Promise<Page<ProductDto>> {
  const where = catalogWhere(params);
  const total = await db.product.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.product.findMany({
    where,
    include: withRelations,
    orderBy: order,
    skip,
    take,
  });

  return { items: rows.map((row) => toDto(row)), total, page, pages };
}

/**
 * Счётчики шапки раздела.
 *
 * 🔴 Скидка считается доменной функцией, а не условием запроса (ADR-011).
 * Действующей её делают три вещи разом — конечная цена ниже обычной и обе
 * границы периода, — и выразить это в `where` Prisma нельзя: сравнения двух
 * колонок там нет. Второй расчёт скидки на SQL разошёлся бы с витриной на
 * первой же правке периода, поэтому читаются пять коротких полей на модель, а
 * решение принимает `getActivePrice`.
 */
export async function adminCounts(now: Date = new Date()): Promise<CatalogCounts> {
  const rows = await db.product.findMany({
    select: {
      visible: true,
      priceNum: true,
      salePrice: true,
      saleFrom: true,
      saleTo: true,
      saleLabel: true,
    },
  });

  return {
    total: rows.length,
    visible: rows.filter((row) => row.visible).length,
    onSale: rows.filter((row) => getActivePrice(row, now).saleActive).length,
  };
}

export async function findById(id: string): Promise<ProductDto | null> {
  const row = await db.product.findUnique({ where: { id }, include: withRelations });
  return row === null ? null : toDto(row);
}

/**
 * Свободный адрес: занятые соседи берутся одним запросом по префиксу, а
 * суффикс подбирает чистая функция из `shared/lib/slug` — та же, что и на
 * клиенте, чтобы предпросмотр адреса в админке совпадал с тем, что сохранится.
 */
async function freeSlug(source: string, exceptId?: string): Promise<string> {
  const base = pageSlug(source);
  const rows = await db.product.findMany({
    where: { slug: { startsWith: base } },
    select: { id: true, slug: true },
  });

  return uniqueSlug(
    base,
    rows.filter((row) => row.id !== exceptId).map((row) => row.slug),
  );
}

export function create(input: ProductInput): Promise<ProductDto> {
  // повтор закрывает гонку подбора адреса — см. withSlugRetry
  return withSlugRetry(() => createOnce(input));
}

async function createOnce(input: ProductInput): Promise<ProductDto> {
  const slug = await freeSlug(input.slug ?? input.name);

  const row = await db.product.create({
    data: {
      slug,
      badge: input.badge,
      name: input.name,
      brand: input.brand ?? null,
      sku: input.sku ?? null,
      areaMax: input.areaMax,
      tag: input.tag ?? null,
      priceNum: input.priceNum,
      link: input.link ?? null,
      visible: input.visible ?? true,
      // новая модель на главную не выносится сама: витрину собирает владелец
      featured: input.featured ?? false,
      sort: input.sort ?? 0,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      specs: { create: (input.specs ?? []).map((spec, index) => ({ ...spec, sort: index })) },
    },
    include: withRelations,
  });

  return toDto(row);
}

/**
 * Обновление товара. Характеристики приходят целиком: их порядок и состав —
 * часть данных, а не набор отдельных полей, поэтому список заменяется.
 */
export function update(id: string, input: ProductPatch): Promise<ProductDto> {
  return withSlugRetry(() => updateOnce(id, input));
}

async function updateOnce(id: string, input: ProductPatch): Promise<ProductDto> {
  const current = await db.product.findUnique({ where: { id }, select: { slug: true } });
  if (current === null) throw new ApiException('not_found', 'Модель не найдена');

  const slug =
    input.slug === undefined || input.slug === current.slug
      ? current.slug
      : await freeSlug(input.slug, id);

  const row = await db.$transaction(async (tx) => {
    if (input.specs !== undefined) {
      await tx.productSpec.deleteMany({ where: { productId: id } });
      await tx.productSpec.createMany({
        data: input.specs.map((spec, index) => ({ productId: id, ...spec, sort: index })),
      });
    }

    return tx.product.update({
      where: { id },
      // Не переданные поля не должны затираться: PATCH правит часть карточки.
      data: {
        slug,
        ...(input.badge === undefined ? {} : { badge: input.badge }),
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.brand === undefined ? {} : { brand: input.brand }),
        ...(input.sku === undefined ? {} : { sku: input.sku }),
        ...(input.areaMax === undefined ? {} : { areaMax: input.areaMax }),
        ...(input.tag === undefined ? {} : { tag: input.tag }),
        ...(input.priceNum === undefined ? {} : { priceNum: input.priceNum }),
        ...(input.link === undefined ? {} : { link: input.link }),
        ...(input.visible === undefined ? {} : { visible: input.visible }),
        ...(input.featured === undefined ? {} : { featured: input.featured }),
        ...(input.sort === undefined ? {} : { sort: input.sort }),
        ...(input.seoTitle === undefined ? {} : { seoTitle: input.seoTitle }),
        ...(input.seoDescription === undefined ? {} : { seoDescription: input.seoDescription }),
      },
      include: withRelations,
    });
  });

  return toDto(row);
}

export async function remove(id: string): Promise<{ slug: string }> {
  const row = await db.product.findUnique({ where: { id }, select: { slug: true } });
  if (row === null) throw new ApiException('not_found', 'Модель не найдена');
  await db.product.delete({ where: { id } });
  return row;
}

/**
 * Скидка задаётся конечной ценой и периодом (ADR-011).
 * `salePrice: null` снимает скидку вместе с подписью и периодом.
 */
export async function setSale(id: string, input: SaleInput): Promise<ProductDto> {
  const exists = await db.product.findUnique({ where: { id }, select: { priceNum: true } });
  if (exists === null) throw new ApiException('not_found', 'Модель не найдена');

  /* 🔴 Цена по акции обязана быть ниже обычной, и проверить это может только
     тот, кто знает обычную: в теле запроса её нет и быть не должно (ADR-011).

     До этой проверки сервер принимал любую цену молча. Скидка «за 45 000
     вместо 40 000» сохранялась, в панели значилась заданной, а на витрине не
     показывалась вовсе — `getActivePrice` такую отбрасывает. Разошлись не цифры
     на сайте, а форма и её результат, и узнать об этом было неоткуда. */
  if (input.salePrice !== null && input.salePrice >= exists.priceNum) {
    throw new ApiException(
      'validation_error',
      `Цена по акции должна быть ниже обычной — ${exists.priceNum} ₽`,
      'salePrice',
    );
  }

  const cleared = input.salePrice === null;

  const row = await db.product.update({
    where: { id },
    data: {
      salePrice: input.salePrice,
      saleFrom: cleared ? null : (input.saleFrom ?? null),
      saleTo: cleared ? null : (input.saleTo ?? null),
      saleLabel: cleared ? null : (input.saleLabel ?? null),
    },
    include: withRelations,
  });

  return toDto(row);
}

export async function addPhoto(
  productId: string,
  photo: { url: string; alt?: string | null },
): Promise<PhotoDto> {
  const existing = await db.productPhoto.count({ where: { productId } });

  const row = await db.productPhoto.create({
    data: {
      productId,
      url: photo.url,
      alt: photo.alt ?? null,
      // Первая загруженная фотография становится главной сама: карточка без
      // главного фото — это карточка без фото.
      isMain: existing === 0,
      sort: existing,
    },
  });

  return { id: row.id, url: row.url, alt: row.alt, isMain: row.isMain, sort: row.sort };
}

export async function updatePhoto(
  productId: string,
  photoId: string,
  input: PhotoUpdate,
): Promise<PhotoDto> {
  const photo = await db.productPhoto.findFirst({ where: { id: photoId, productId } });
  if (photo === null) throw new ApiException('not_found', 'Фотография не найдена');

  const row = await db.$transaction(async (tx) => {
    if (input.isMain === true) {
      // Главная фотография ровно одна — снимаем флаг с остальных.
      await tx.productPhoto.updateMany({
        where: { productId, NOT: { id: photoId } },
        data: { isMain: false },
      });
    }

    return tx.productPhoto.update({
      where: { id: photoId },
      // Поля, которых нет в запросе, не должны затираться — отсюда точечная сборка.
      data: {
        ...(input.alt === undefined ? {} : { alt: input.alt }),
        ...(input.isMain === undefined ? {} : { isMain: input.isMain }),
        ...(input.sort === undefined ? {} : { sort: input.sort }),
      },
    });
  });

  return { id: row.id, url: row.url, alt: row.alt, isMain: row.isMain, sort: row.sort };
}

export async function removePhoto(productId: string, photoId: string): Promise<void> {
  const photo = await db.productPhoto.findFirst({ where: { id: photoId, productId } });
  if (photo === null) throw new ApiException('not_found', 'Фотография не найдена');

  await db.$transaction(async (tx) => {
    await tx.productPhoto.delete({ where: { id: photoId } });

    if (!photo.isMain) return;

    // Удалили главную — главной становится следующая, иначе карточка останется
    // с фотографиями, но без обложки.
    const next = await tx.productPhoto.findFirst({
      where: { productId },
      orderBy: { sort: 'asc' },
    });
    if (next !== null) {
      await tx.productPhoto.update({ where: { id: next.id }, data: { isMain: true } });
    }
  });
}
