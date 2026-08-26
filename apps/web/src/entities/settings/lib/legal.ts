import type { Legal } from '@/entities/settings/model';

/**
 * Наименование организации: «ИП Иванов Иван Иванович», «ООО «Пример»».
 *
 * 🔴 Одна строка на проект. Её печатает футер и её же получает `legalName` в
 * разметке `Organization`: раньше это были два независимых поля настроек, и
 * разойтись они успели уже в дев-данных — прямое нарушение инварианта 9
 * (числа и факты в JSON-LD совпадают с видимым текстом). См. ADR-106.
 *
 * Форма собственности хранится отдельным полем, но владелец легко впишет её и
 * в наименование — тогда получилось бы «ИП ИП Иванов». Поэтому префикс
 * добавляется, только если его там ещё нет.
 */
export function legalTitle(legal: Legal): string {
  const name = legal.name.trim();
  if (name === '') return legal.form;
  return name.toLowerCase().startsWith(legal.form.toLowerCase()) ? name : `${legal.form} ${name}`;
}
