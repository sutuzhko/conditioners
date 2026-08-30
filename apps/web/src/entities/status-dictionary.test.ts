import { describe, expect, it } from 'vitest';

import type { BadgeVariant } from '@/shared/ui';

import { LEAD_STATUS_VARIANT } from './lead/model';
import { ORDER_STATUS_VARIANT } from './order/model';
import { REVIEW_STATUS_VARIANT } from './review/model';

/**
 * 🔴 Словарь статусов панели — машиной, а не глазом (issue #326).
 *
 * Главная поломка старой панели: три вида плашек в одной строке заказа,
 * «Отказ» серый в нарядах и краской скидки в журнале доставки, «Новая»
 * бирюзовая в разделе заявок и янтарная в карточке клиента. Каждая краска по
 * отдельности выглядела разумно — расходились они между разделами, и увидеть
 * это можно было, только открыв два экрана рядом.
 *
 * Поэтому словарь закрытый: шесть красок на всю панель, у каждого значения
 * ровно одна, и живут значения в домене, а не в подписях раздела.
 */
const PANEL_COLOURS: readonly BadgeVariant[] = [
  'neutral',
  'accent',
  'warning',
  'success',
  'danger',
  'info',
];

const DICTIONARIES = {
  заказ: ORDER_STATUS_VARIANT,
  заявка: LEAD_STATUS_VARIANT,
  отзыв: REVIEW_STATUS_VARIANT,
} as const;

describe('Словарь статусов панели', () => {
  it.each(Object.entries(DICTIONARIES))('«%s» набран только красками словаря', (_name, dict) => {
    for (const [status, variant] of Object.entries(dict)) {
      expect(PANEL_COLOURS, `статус «${status}» набран краской «${variant}»`).toContain(variant);
    }
  });

  /* `sale` — единственный тёплый акцент витрины и принадлежит скидке
     (DESIGN_BRIEF §10). Статус, набранный цветом акции, читается предложением,
     а не проблемой; `dark` и `onPanel` — оформление витрины, не состояние. */
  it.each(Object.entries(DICTIONARIES))('«%s» не занимает красок витрины', (_name, dict) => {
    const values = Object.values(dict);

    expect(values).not.toContain('sale');
    expect(values).not.toContain('dark');
    expect(values).not.toContain('onPanel');
  });

  /* Успех и отказ — противоположные исходы, и различать их обязана не только
     краска, но и сам факт, что они разные. Совпадение здесь означает, что
     словарь собран по месту, а не из общего списка. */
  it('исход и отказ не совпадают краской ни в одном разделе', () => {
    expect(ORDER_STATUS_VARIANT.done).not.toBe(ORDER_STATUS_VARIANT.cancelled);
    expect(LEAD_STATUS_VARIANT.done).not.toBe(LEAD_STATUS_VARIANT.rejected);
    expect(REVIEW_STATUS_VARIANT.approved).not.toBe(REVIEW_STATUS_VARIANT.rejected);
  });
});
