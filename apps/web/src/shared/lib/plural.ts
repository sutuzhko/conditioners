/**
 * Русское склонение существительного после числа.
 *
 * Правило одно на язык, а писалось по месту — в каталоге оно жило вложенным
 * тернарником, который проект запрещает, и на второй такой подписи разошлось
 * бы с первой на числах 11–14.
 *
 * `Intl.PluralRules` даёт тот же ответ, но требует от вызывающего разобрать
 * категории `one | few | many`; три слова подряд читаются проще и ровно так,
 * как их произносят: «1 обращение, 2 обращения, 5 обращений».
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const teens = Math.abs(count) % 100;
  if (teens >= 11 && teens <= 14) return many;

  const last = Math.abs(count) % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Число вместе со склонённым словом: «12 характеристик». */
export function pluralize(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`;
}
