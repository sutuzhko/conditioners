import type { Address, Geo } from '@/entities/settings/model';

/**
 * Сборка адреса и ссылки на карту.
 *
 * Функции живут в блоке, а не в `shared/lib`: правило слоёв запрещает импорт
 * вбок между виджетами, а общего форматирования адреса в проекте пока нет —
 * футер собирает свою строку сам. Если понадобится третьему блоку, строку
 * пора выносить в `shared`.
 */

function filled(parts: readonly string[]): readonly string[] {
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

/**
 * Адрес для человека: «Тула, ул. Демонстрационная, 1, оф. 5».
 *
 * Индекс не входит: он нужен реквизитам в футере, а в блоке контактов только
 * удлиняет строку. Регион тоже: он виден в заголовке секции.
 */
export function addressLine(address: Address): string {
  return filled([address.city, address.street, address.building, address.office]).join(', ');
}

/** Запрос для поиска по карте: с регионом, чтобы улица нашлась однозначно. */
export function mapQuery(address: Address): string {
  return filled([address.region, address.city, address.street, address.building]).join(', ');
}

/**
 * Ссылка на Яндекс.Карты.
 *
 * 🔴 Встроенной карты на сайте нет сознательно: iframe Яндекс.Карт — это
 * сторонний скрипт и чужие cookie, а единственный внешний скрипт у нас —
 * Метрика (ADR-024). Карта открывается по ссылке в новой вкладке.
 *
 * Координаты точнее адреса, поэтому при их наличии ставится метка. Нет ни
 * координат, ни адреса — ссылки нет вовсе: «открыть в картах» без адреса
 * ведёт в пустоту.
 */
export function yandexMapsHref(address: Address, geo?: Geo | null): string | null {
  const lat = geo?.lat ?? null;
  const lng = geo?.lng ?? null;

  if (lat !== null && lng !== null) {
    const point = `${lng},${lat}`;
    return `https://yandex.ru/maps/?ll=${point}&z=17&pt=${point}`;
  }

  const query = mapQuery(address);
  if (query === '') return null;

  return `https://yandex.ru/maps/?text=${encodeURIComponent(query)}`;
}
