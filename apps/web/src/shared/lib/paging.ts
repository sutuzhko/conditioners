/**
 * Разбивка длинных списков панели на страницы.
 *
 * 🔴 Одно место на проект: страницы считает и запрос к базе, и компонент
 * разбивки. Список, посчитавший число страниц по своему размеру, показал бы
 * пустую последнюю — это не теория, а типовой способ разойтись.
 *
 * Ссылками, а не состоянием на клиенте: страница живёт в адресе, её можно
 * сохранить и прислать (ADR-105). Сам компонент — `shared/ui/Pager`.
 */

/**
 * Сколько записей показывается на странице списка панели.
 *
 * Восемь — из прототипа CRM. Число общее для клиентов, заявок и отзывов:
 * разный шаг листания в соседних разделах владелец воспринимает как сбой,
 * а не как настройку.
 */
export const ADMIN_PAGE_SIZE = 8;

/** Страница списка: сами записи и всё, что нужно для разбивки. */
export type Page<T> = {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pages: number;
};

/**
 * Номер страницы из адресной строки.
 *
 * Мусор и ноль — это первая страница, а не ошибка: адрес правят руками и
 * присылают друг другу, и отказ вместо списка там ничего не объясняет.
 */
export function pageNumber(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

/**
 * Границы выборки для запрошенной страницы.
 *
 * Номер за пределами списка прижимается к последней существующей странице:
 * так бывает после удаления последней записи со страницы, и пустой экран
 * вместо списка выглядит поломкой, а не концом данных.
 *
 * Пустой список — это одна страница, а не ноль: разбивка на нём просто не
 * показывается, а «страница 1 из 0» не значит ничего.
 */
export function pageWindow(
  total: number,
  requested: number,
  size: number = ADMIN_PAGE_SIZE,
): { readonly page: number; readonly pages: number; readonly skip: number; readonly take: number } {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, requested), pages);

  return { page, pages, skip: (page - 1) * size, take: size };
}
