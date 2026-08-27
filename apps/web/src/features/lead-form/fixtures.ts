import type { LeadContext } from '@/entities/lead/model';
import type { ButtonLinkHref } from '@/shared/ui';

/**
 * Данные для историй и тестов. Настоящие телефон и адрес политики приходят из
 * настроек компании — в коде их нет (docs/CLAUDE.md, инвариант 8).
 */

/** Демонстрационный номер: показывает вёрстку запасного пути, никуда не ведёт. */
export const phoneFixture = '+74872000000';

/** Страница политики появится в волне 2 — до тех пор адрес объектом, не литералом. */
export const policyHrefFixture: ButtonLinkHref = { pathname: '/privacy' };

export const titleFixture = 'Оставьте заявку — поможем с выбором';

export const descriptionFixture =
  'Заполните форму — специалист перезвонит, поможет с выбором и ответит на вопросы.';

/**
 * Контекст, с которым человек дошёл до формы: посчитал смету, подобрал модель
 * по площади и отметил ещё одну. Цифры демонстрационные — настоящие приходят
 * из прайса и каталога (инвариант 8).
 */
export const leadContextFixture: LeadContext = {
  estimate: {
    params: [
      { label: 'Класс мощности', value: '09 · до 27 м²' },
      { label: 'Длина трассы', value: '7 м' },
      { label: 'Этаж', value: '1–9' },
      { label: 'Штробление', value: 'да' },
      { label: 'Количество блоков', value: '1' },
    ],
    lines: [
      { label: 'Базовый монтаж, класс 09', amount: 6000 },
      { label: 'Трасса сверх включённой, 4 м × 700 ₽/м', amount: 2800 },
      { label: 'Штробление, 7 м × 900 ₽/м', amount: 6300 },
    ],
    perUnit: null,
    qty: 1,
    total: 15_100,
  },
  pick: {
    area: 25,
    place: 'Квартира',
    model: { slug: 'split-09', name: 'Сплит-система 09', price: 34_900, oldPrice: 39_900 },
  },
  model: null,
  liked: [{ slug: 'split-07', name: 'Сплит-система 07', price: 28_900, oldPrice: null }],
};
