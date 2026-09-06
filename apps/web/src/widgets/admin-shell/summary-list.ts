/**
 * Список «Ближайших дел»: колонки, отбор, порядок и адрес (issue #591).
 *
 * 🔴 Всё состояние таблицы живёт в адресе, а не в компоненте. «Просроченное,
 * по сумме, вторая страница» — это ссылка, которую владелец кладёт в закладки
 * и присылает себе на телефон; состояние на клиенте дало бы ровно тот же
 * экран, но ценой килобайтов в бюджете панели и неработающего отбора там, где
 * JS не выполнился.
 *
 * 🔴 Ключи параметров английские (инвариант 17), и ни один из них не
 * называется `tab`: `tab` на этом адресе уже занят сегментом сводки
 * (`/admin?tab=money`), и вторая сущность с тем же именем сломала бы обе.
 */
import { ADMIN_PAGE_SIZE, pageNumber } from '@/shared/lib/paging';

/** Колонка таблицы. Ключ — он же имя ячейки и подпись поля в карточке. */
export type UpcomingColumn = 'when' | 'work' | 'installer' | 'status' | 'sum';

export const UPCOMING_COLUMNS: readonly UpcomingColumn[] = [
  'when',
  'work',
  'installer',
  'status',
  'sum',
];

export function isUpcomingColumn(value: string): value is UpcomingColumn {
  return UPCOMING_COLUMNS.some((column) => column === value);
}

/**
 * Колонки, которые нельзя выключить.
 *
 * «Когда» и «Работа и объект» опознают строку: список ближайших дел без
 * времени перестаёт быть планом, а без работы — списком неизвестно чего.
 */
export function upcomingColumnLocked(column: UpcomingColumn): boolean {
  return column === 'when' || column === 'work';
}

/** Видимые колонки при этом наборе выключенных. */
export function visibleUpcomingColumns(
  hidden: readonly UpcomingColumn[] = [],
): readonly UpcomingColumn[] {
  return UPCOMING_COLUMNS.filter(
    (column) => upcomingColumnLocked(column) || !hidden.some((item) => item === column),
  );
}

/** Что показывать. Одно значение, а не набор флагов: у пилюли один ответ. */
export type UpcomingShow = 'all' | 'orders' | 'events' | 'overdue' | 'unassigned';

export const UPCOMING_SHOWS: readonly UpcomingShow[] = [
  'all',
  'orders',
  'events',
  'overdue',
  'unassigned',
];

export function isUpcomingShow(value: string): value is UpcomingShow {
  return UPCOMING_SHOWS.some((show) => show === value);
}

/** Порядок строк: ближайшие по времени или крупные по деньгам. */
export type UpcomingSort = 'time' | 'sum';

export const UPCOMING_SORTS: readonly UpcomingSort[] = ['time', 'sum'];

export function isUpcomingSort(value: string): value is UpcomingSort {
  return UPCOMING_SORTS.some((sort) => sort === value);
}

/** Всё состояние таблицы разом: пилюли строят ссылки, меняя по одному полю. */
export type UpcomingFilters = {
  readonly show: UpcomingShow;
  readonly sort: UpcomingSort;
  /** Поисковая строка. Пустая — искать нечего. */
  readonly query: string;
  /** Выключенные колонки. Запертые сюда не попадают ни при каком адресе. */
  readonly hidden: readonly UpcomingColumn[];
  readonly page: number;
};

export const DEFAULT_UPCOMING_FILTERS: UpcomingFilters = {
  show: 'all',
  sort: 'time',
  query: '',
  hidden: [],
  page: 1,
};

/** Сколько строк на странице. То же число, что у остальных списков панели. */
export const UPCOMING_PAGE_SIZE = ADMIN_PAGE_SIZE;

/** Адрес «Обзора». Сегмент в него не уезжает: `/admin` и есть «Обзор». */
export const SUMMARY_PATH = '/admin';

/** Имена параметров адреса — одно место на чтение и на запись. */
export const UPCOMING_PARAMS = {
  show: 'show',
  sort: 'sort',
  columns: 'cols',
  query: 'q',
  page: 'page',
} as const;

type RawParams = {
  readonly show?: string | undefined;
  readonly sort?: string | undefined;
  readonly cols?: string | undefined;
  readonly q?: string | undefined;
  readonly page?: string | undefined;
};

/**
 * Разбор адреса.
 *
 * 🔴 Мусор в параметре открывает умолчание, а не роняет раздел: адрес правят
 * руками и присылают друг другу, и отказ вместо сводки там ничего не
 * объясняет (issue #341).
 */
export function upcomingFiltersFromParams(params: RawParams): UpcomingFilters {
  const cols = (params.cols ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(isUpcomingColumn)
    /* Запертую колонку не выключить и адресом: `?cols=when` не должно
       оставлять строку без времени. */
    .filter((column) => !upcomingColumnLocked(column));

  return {
    show:
      params.show !== undefined && isUpcomingShow(params.show)
        ? params.show
        : DEFAULT_UPCOMING_FILTERS.show,
    sort:
      params.sort !== undefined && isUpcomingSort(params.sort)
        ? params.sort
        : DEFAULT_UPCOMING_FILTERS.sort,
    query: params.q?.trim() ?? '',
    hidden: [...new Set(cols)],
    page: pageNumber(params.page),
  };
}

/**
 * Параметры адреса из состояния. Умолчания не пишутся: `?show=all&sort=time`
 * — это параметры, которые ничего не выбирают, и ссылка с ними читается как
 * применённый отбор там, где его нет.
 */
export function upcomingQuery(filters: UpcomingFilters): Record<string, string> {
  return {
    ...(filters.show === DEFAULT_UPCOMING_FILTERS.show
      ? {}
      : { [UPCOMING_PARAMS.show]: filters.show }),
    ...(filters.sort === DEFAULT_UPCOMING_FILTERS.sort
      ? {}
      : { [UPCOMING_PARAMS.sort]: filters.sort }),
    ...(filters.query === '' ? {} : { [UPCOMING_PARAMS.query]: filters.query }),
    ...(filters.hidden.length === 0
      ? {}
      : { [UPCOMING_PARAMS.columns]: [...filters.hidden].sort().join(',') }),
    ...(filters.page > 1 ? { [UPCOMING_PARAMS.page]: String(filters.page) } : {}),
  };
}

/**
 * Адрес списка с этим состоянием.
 *
 * 🔴 Любая смена условия сбрасывает страницу на первую. Иначе владелец,
 * стоящий на третьей странице и нажавший «Просроченное», получал бы пустой
 * экран: у отобранного списка третьей страницы обычно нет.
 */
export function upcomingHref(filters: UpcomingFilters): {
  readonly pathname: string;
  readonly query: Record<string, string>;
} {
  return { pathname: SUMMARY_PATH, query: upcomingQuery(filters) };
}

/** Та же ссылка, но с первой страницы: ею пользуются все пилюли. */
export function upcomingReset(
  filters: UpcomingFilters,
  patch: Partial<UpcomingFilters>,
): { readonly pathname: string; readonly query: Record<string, string> } {
  return upcomingHref({ ...filters, ...patch, page: 1 });
}

/** Колонка выключена — значит, её нет в адресе среди видимых. */
export function toggledColumns(
  hidden: readonly UpcomingColumn[],
  column: UpcomingColumn,
): readonly UpcomingColumn[] {
  return hidden.some((item) => item === column)
    ? hidden.filter((item) => item !== column)
    : [...hidden, column];
}
