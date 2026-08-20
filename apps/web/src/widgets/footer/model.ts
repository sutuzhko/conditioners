import type { ButtonLinkHref } from '@/shared/ui';

/**
 * Пункт списка ссылок футера. Структурно совпадает с пунктом навигации шапки —
 * страница передаёт в оба блока один и тот же массив.
 */
export interface NavItem {
  readonly label: string;
  readonly href: ButtonLinkHref;
  readonly current?: boolean | undefined;
}
