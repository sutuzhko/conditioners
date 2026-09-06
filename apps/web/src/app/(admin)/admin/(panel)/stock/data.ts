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
 * Позиция, ради которой заводят движение.
 *
 * 🔴 Позиция обязательна и приходит адресом: движение заводят, стоя на
 * конкретной строке остатков — перетаскиванием ячейки, кнопкой «Переместить»
 * или из карточки позиции (ADR-137). Адрес без позиции ничего не описывает,
 * поэтому это не пустая форма, а несуществующий адрес.
 *
 * 🔴 Отдельная функция, потому что она решает **код ответа** (issue #651):
 * страница зовёт её до первого куска потока, и удалённая позиция отвечает
 * честным 404, а не 200 с текстом «не найдено». Зоны к этому вопросу
 * отношения не имеют и приезжают следом.
 */
export async function moveItemRef(params: StockMoveParams): Promise<StockItemRef> {
  const session = await requireOwnerPage();

  const id = params.item?.trim() ?? '';
  if (id === '') notFound();

  const found = await findItem(id, { role: session.role, userId: session.userId });
  if (found === null) notFound();

  return itemRefOf(found.item);
}

/** Зоны хранения для формы движения: куда и откуда можно переложить. */
export async function moveZones(): Promise<readonly StockZoneCard[]> {
  const session = await requireOwnerPage();

  return listZones({ role: session.role, userId: session.userId });
}

/**
 * Позиция и зоны для формы движения — всё разом, для окна перехвата.
 *
 * Окно рисуется поверх готового списка и заготовки не имеет: делить его ответ
 * на куски незачем.
 */
export async function moveFormData(params: StockMoveParams): Promise<{
  readonly items: readonly StockItemRef[];
  readonly zones: readonly StockZoneCard[];
  readonly initial: StockMoveDraft;
}> {
  const [item, zones] = await Promise.all([moveItemRef(params), moveZones()]);

  return { items: [item], zones, initial: moveDraftOf(params) };
}
