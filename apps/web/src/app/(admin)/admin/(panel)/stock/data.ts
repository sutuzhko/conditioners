/**
 * Данные форм раздела: одни и те же для окна и для страницы за ним.
 *
 * 🔴 Перехватывающий маршрут рисует то же самое, что и прямой заход по адресу
 * (ADR-137). Второй запрос, собранный отдельно для окна, разошёлся бы с первым
 * на первой же правке — и окно показывало бы не то, что страница.
 */
import { notFound } from 'next/navigation';

import {
  itemRefOf,
  moveDraftOf,
  type StockItemProduct,
  type StockItemRef,
  type StockMoveDraft,
  type StockZoneCard,
  type StockZonePerson,
} from '@/features/stock-manager';
import { staffTitle } from '@/entities/staff/model';
import { requireOwnerPage } from '@/server/guards';
import { list as listStaff } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/products';
import { item as findItem, zones as listZones } from '@/server/repo/stock';

/**
 * Форме позиции нужны только имя и адрес модели: фотографии, характеристики и
 * цены каталога складу не нужны вовсе.
 */
export async function itemFormData(): Promise<{ readonly products: readonly StockItemProduct[] }> {
  await requireOwnerPage();

  const catalog = await listAll();

  return {
    products: catalog.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
    })),
  };
}

/**
 * Машину закрепляют за человеком, а не за должностью: список — все, кто
 * заходит в панель, включая самого владельца, если ездит он.
 */
export async function zoneFormData(): Promise<{ readonly people: readonly StockZonePerson[] }> {
  await requireOwnerPage();

  const staff = await listStaff();

  return {
    people: staff
      .filter((person) => person.active)
      .map((person) => ({ id: person.id, name: staffTitle(person) })),
  };
}

export type StockMoveParams = {
  readonly item?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly kind?: string | undefined;
};

/**
 * Позиция и зоны для формы движения.
 *
 * 🔴 Позиция обязательна и приходит адресом: движение заводят, стоя на
 * конкретной строке остатков — перетаскиванием ячейки, кнопкой «Переместить»
 * или из карточки позиции (ADR-137). Адрес без позиции ничего не описывает,
 * поэтому это не пустая форма, а несуществующий адрес.
 */
export async function moveFormData(params: StockMoveParams): Promise<{
  readonly items: readonly StockItemRef[];
  readonly zones: readonly StockZoneCard[];
  readonly initial: StockMoveDraft;
}> {
  const session = await requireOwnerPage();
  const viewer = { role: session.role, userId: session.userId };

  const id = params.item?.trim() ?? '';
  if (id === '') notFound();

  const [found, zones] = await Promise.all([findItem(id, viewer), listZones(viewer)]);
  if (found === null) notFound();

  return {
    items: [itemRefOf(found.item)],
    zones,
    initial: moveDraftOf(params),
  };
}
