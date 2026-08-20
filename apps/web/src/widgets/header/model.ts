import type { ButtonLinkHref } from '@/shared/ui';

/**
 * Пункт навигации. Адрес типизирован так же, как у next/link: при включённых
 * typedRoutes опечатка в маршруте ловится компилятором на стороне страницы,
 * а блок остаётся представлением и ничего не знает о карте URL.
 */
export interface NavItem {
  readonly label: string;
  readonly href: ButtonLinkHref;
  /** активный раздел — на него ставится aria-current="page" */
  readonly current?: boolean | undefined;
}
