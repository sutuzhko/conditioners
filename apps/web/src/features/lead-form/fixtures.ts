import type { ButtonLinkHref } from '@/shared/ui';

/**
 * Данные для историй и тестов. Настоящие телефон и адрес политики приходят из
 * настроек компании — в коде их нет (docs/CLAUDE.md, инвариант 8).
 */

/** Демонстрационный номер: показывает вёрстку запасного пути, никуда не ведёт. */
export const phoneFixture = '+74872000000';

/** Страница политики появится в волне 2 — до тех пор адрес объектом, не литералом. */
export const policyHrefFixture: ButtonLinkHref = { pathname: '/politika-konfidencialnosti' };

export const titleFixture = 'Оставьте заявку — поможем с выбором';

export const descriptionFixture =
  'Заполните форму — специалист перезвонит, поможет с выбором и ответит на вопросы.';
