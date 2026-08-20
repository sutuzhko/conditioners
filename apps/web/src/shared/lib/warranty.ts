/**
 * Сроки гарантии для вывода на странице.
 *
 * 🔴 Срок — факт о компании: он приходит из настроек и нигде не подставляется
 * по умолчанию (инвариант 8). Незаполненное поле выпадает из списка, обе
 * пустые — блока гарантии нет вовсе: «до 3 лет» из макета не имеет права
 * оказаться в вёрстке.
 *
 * Функция общая для блоков «Доверие» и «Монтаж»: правило одно, а подписи у
 * каждого блока свои, поэтому они приходят параметром. Общий слой не знает
 * доменного типа `Warranty` (из shared наверх не импортируют) — ему достаточно
 * формы данных, а сущность настроек ей соответствует.
 */

export type WarrantyValues = {
  readonly installation: string;
  readonly equipment: string;
};

export type WarrantyLabels = WarrantyValues;

/** Строка гарантии: подпись из контента блока, срок — из настроек. */
export type WarrantyTerm = {
  readonly label: string;
  readonly value: string;
};

export function warrantyTerms(
  warranty: WarrantyValues | undefined,
  labels: WarrantyLabels,
): readonly WarrantyTerm[] {
  if (warranty === undefined) return [];

  const terms: WarrantyTerm[] = [];
  const installation = warranty.installation.trim();
  const equipment = warranty.equipment.trim();

  if (installation !== '') terms.push({ label: labels.installation, value: installation });
  if (equipment !== '') terms.push({ label: labels.equipment, value: equipment });

  return terms;
}
