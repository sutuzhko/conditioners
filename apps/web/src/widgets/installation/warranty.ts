import type { Warranty } from '@/entities/settings/model';

import { stepsContent } from './content';

/** Строка гарантии в последнем шаге: подпись из контента, срок — из настроек. */
export type WarrantyTerm = {
  readonly label: string;
  readonly value: string;
};

/**
 * Сроки гарантии для шага «Запуск и гарантия».
 *
 * 🔴 Срок — факт о компании: он приходит из настроек и нигде не подставляется
 * по умолчанию (инвариант 8). Незаполненное поле выпадает из списка, пустая
 * гарантия убирает строку целиком — «до 3 лет» из макета не имеет права
 * оказаться в вёрстке.
 */
export function warrantyTerms(warranty: Warranty | undefined): readonly WarrantyTerm[] {
  if (warranty === undefined) return [];

  const terms: WarrantyTerm[] = [];
  const installation = warranty.installation.trim();
  const equipment = warranty.equipment.trim();

  if (installation !== '') {
    terms.push({ label: stepsContent.warranty.installation, value: installation });
  }
  if (equipment !== '') {
    terms.push({ label: stepsContent.warranty.equipment, value: equipment });
  }

  return terms;
}
