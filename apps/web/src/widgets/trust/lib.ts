import type { Warranty } from '@/entities/settings/model';

import { whyUsContent } from './content';

/** Строка карточки гарантии: подпись из контента, срок — из настроек. */
export type WarrantyTerm = {
  readonly label: string;
  readonly value: string;
};

/**
 * Сроки гарантии для карточки «Почему нас выбирают».
 *
 * 🔴 Срок — факт о компании: он приходит из настроек и нигде не подставляется
 * по умолчанию (инвариант 8). Незаполненное поле просто выпадает из списка,
 * а пустая гарантия целиком убирает карточку.
 */
export function warrantyTerms(warranty: Warranty | undefined): readonly WarrantyTerm[] {
  if (warranty === undefined) return [];

  const terms: WarrantyTerm[] = [];
  const installation = warranty.installation.trim();
  const equipment = warranty.equipment.trim();

  if (installation !== '') {
    terms.push({ label: whyUsContent.warranty.installation, value: installation });
  }
  if (equipment !== '') {
    terms.push({ label: whyUsContent.warranty.equipment, value: equipment });
  }

  return terms;
}
