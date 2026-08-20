import type { Product } from '../model';
import { OFFICE_PLACE_TYPE } from '../model';

/** Подбору нужны только площадь, видимость и порядок — не весь товар. */
export type PickableProduct = Pick<Product, 'areaMax' | 'visible' | 'sort'>;

function isOffice(placeType: string | null | undefined): boolean {
  return (placeType ?? '').trim().toLowerCase() === OFFICE_PLACE_TYPE.toLowerCase();
}

/**
 * Подбор модели по площади (PROJECT §2.3):
 *
 *   видимые модели, отсортированные по areaMax ↑
 *   берём первую, у которой areaMax >= указанной площади
 *   если такой нет — берём последнюю (самую мощную)
 *   если тип помещения «Офис» и есть модель мощнее — сдвигаемся на одну вверх
 *
 * Сдвиг для офиса — не прихоть: техника и люди дают дополнительный приток тепла.
 * `null` означает, что подбирать не из чего, — показывать «ничего не найдено»
 * честнее, чем предлагать невидимую модель.
 */
export function pickByArea<T extends PickableProduct>(
  products: readonly T[],
  area: number,
  placeType?: string | null,
): T | null {
  const sorted = products
    .filter((p) => p.visible)
    .slice()
    .sort((a, b) => a.areaMax - b.areaMax || a.sort - b.sort);

  if (sorted.length === 0) return null;

  const found = sorted.findIndex((p) => p.areaMax >= area);
  let index = found === -1 ? sorted.length - 1 : found;

  if (isOffice(placeType) && index < sorted.length - 1) index += 1;

  return sorted[index] ?? null;
}
