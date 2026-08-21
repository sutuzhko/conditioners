import type { ButtonLinkHref } from '@/shared/ui';

/**
 * Данные для историй и тестов. Настоящий адрес политики знает страница —
 * в коде фичи его нет (docs/CLAUDE.md, инвариант 8).
 */

/** Страница политики появится в волне 2 — до тех пор адрес объектом, не литералом. */
export const policyHrefFixture: ButtonLinkHref = { pathname: '/privacy' };
