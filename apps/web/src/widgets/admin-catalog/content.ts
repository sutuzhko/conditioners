/** Подписи списка моделей. */
import { formatDateShort, formatMoney } from '@/shared/lib/format';

export const adminCatalogContent = {
  title: 'Каталог',
  lead: 'Модели, которые видит посетитель. Порядок в списке — это порядок на сайте.',
  add: 'Добавить модель',
  specsDictionary: 'Справочник характеристик',

  /* Пустой каталог — рабочее состояние, а не ошибка: сайт стартует без
     товаров, и владелец заполняет его сам. */
  emptyTitle: 'В каталоге пока пусто',
  emptyText:
    'Пока не добавлена ни одна модель, разделы каталога на сайте показывают пустое состояние.',

  colName: 'Модель',
  colCategory: 'Категория',
  colArea: 'Площадь',
  colPrice: 'Цена',
  colFeatured: 'На главной',
  colVisible: 'Видимость',
  colSort: 'Порядок',

  featured: 'На главной',
  notFeatured: 'Только в каталоге',
  /* 🔴 Цена без скидки называется прямо, а не оставляется пустой строкой:
     пустое место в колонке читается как «данных нет», а данные есть — скидки
     нет. Заодно строка занимает то же место, что и скидка, и главная цифра
     ряда не пляшет. */
  noSale: 'Скидки нет',
  noPrice: 'Цена не задана',
  edit: 'Править',

  area: (areaMax: number): string => `до ${areaMax} м²`,
  sort: (value: number): string => `порядок ${value}`,
  /* 🔴 Перечёркнутая цена читается вслух как обычная: старую цену надо
     назвать старой, иначе диктор произнесёт две цены подряд без разницы. */
  oldPrice: (value: number): string => `Прежняя цена ${formatMoney(value)}`,
  discount: (percent: number): string => `−${percent}%`,
  saleUntil: (iso: string): string => `до ${formatDateShort(iso)}`,
  /** Подпись строки для скринридера: одна ссылка «Править» на десять строк бесполезна. */
  editLabel: (name: string): string => `Править: ${name}`,
  photoAlt: (name: string): string => `Фотография модели: ${name}`,

  /**
   * Подзаголовок раздела: сколько моделей и сколько из них видно.
   *
   * 🔴 Числа считаются из тех же строк, что показаны в таблице, а не берутся
   * вторым запросом: расхождение подписи и списка на одной странице владелец
   * замечает мгновенно и перестаёт верить обоим.
   */
  summary: (total: number, visible: number, onSale: number): string =>
    [
      `${total} ${plural(total, 'модель', 'модели', 'моделей')}`,
      `${visible} ${plural(visible, 'видимая', 'видимые', 'видимых')} на сайте`,
      `${onSale} со скидкой`,
    ].join(' · '),
} as const;

/** Склонение после числа: 1 модель, 2 модели, 5 моделей. */
function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;

  const mod10 = count % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
