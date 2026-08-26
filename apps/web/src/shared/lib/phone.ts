/**
 * Маска телефона для полей ввода.
 *
 * 🔴 Маска ведёт, но не запирает. Человек в июльскую жару набирает номер как
 * привык — с восьмёркой, без кода, со скобками или без; всё это приводится к
 * одному виду по ходу набора. Схема на сервере остаётся мягкой намеренно
 * (`entities/lead/model.ts`): потерять заявку из-за формата нельзя.
 *
 * Российский план нумерации: 11 цифр, первая — 7. Ведущая «8» заменяется на
 * «7», как её и набирают внутри страны.
 */

/** Сколько цифр в полном российском номере, включая код страны. */
export const PHONE_DIGITS = 11;

/** Что показываем в пустом поле — та же разметка, что и у заполненного. */
export const PHONE_PLACEHOLDER = '+7 (___) ___-__-__';

/**
 * Номер в каноническом виде: только цифры, ведущая «8» приведена к «7»,
 * десятизначный номер дополнен кодом страны.
 *
 * Это ключ, по которому человек опознаётся как один и тот же: «+7 (910)
 * 155-24-68», «8 910 155 24 68» и «9101552468» дают одну строку. По нему идут
 * дедупликация клиентов и поиск по телефону (ADR-103), от него же считаются
 * `tel:` и человеческое форматирование в `shared/lib/format`.
 *
 * Номер, не похожий на российский, возвращается своими цифрами как есть:
 * выбросить непонятное значение хуже, чем сохранить его дословно.
 */
export function phoneKey(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

/**
 * Цифры номера без кода страны: то, что человек реально ввёл.
 *
 * Ведущая «8» и «7» отбрасываются, потому что код мы рисуем сами. «9» в
 * начале сохраняется целиком — это первая цифра мобильного, а не код.
 */
export function phoneBody(input: string): string {
  const digits = input.replace(/\D/g, '');
  const withoutCountry =
    digits.startsWith('8') || digits.startsWith('7') ? digits.slice(1) : digits;

  return withoutCountry.slice(0, PHONE_DIGITS - 1);
}

/**
 * Номер в виде `+7 (912) 345-67-89`. Незаполненный хвост не дорисовывается:
 * подчёркивания в значении поля мешают правке и попадают в буфер обмена.
 */
export function maskPhone(input: string): string {
  const body = phoneBody(input);
  if (body === '') return '';

  const area = body.slice(0, 3);
  const first = body.slice(3, 6);
  const second = body.slice(6, 8);
  const third = body.slice(8, 10);

  let result = `+7 (${area}`;
  if (body.length >= 3) result += ')';
  if (first !== '') result += ` ${first}`;
  if (second !== '') result += `-${second}`;
  if (third !== '') result += `-${third}`;

  return result;
}

/** Номер набран полностью: одиннадцать цифр российского плана нумерации. */
export function isPhoneComplete(input: string): boolean {
  return phoneBody(input).length === PHONE_DIGITS - 1;
}

/**
 * Позиция курсора после наложения маски.
 *
 * Считаем не символы, а цифры слева от курсора: маска добавляет скобки и
 * дефисы, и курсор, оставленный на прежнем месте, уезжает в середину
 * разделителя — правка в середине номера превращается в борьбу с полем.
 */
export function caretAfterMask(masked: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) return masked.length;

  let seen = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (/\d/.test(masked[index] ?? '')) {
      seen += 1;
      // код страны нарисован нами — он не считается введённым
      if (seen > 1 && seen - 1 === digitsBeforeCaret) return index + 1;
    }
  }

  return masked.length;
}

/** Сколько цифр стоит левее курсора, не считая кода страны. */
export function digitsBefore(value: string, caret: number): number {
  const head = value.slice(0, caret).replace(/\D/g, '');
  const withoutCountry = head.startsWith('8') || head.startsWith('7') ? head.slice(1) : head;
  return withoutCountry.length;
}
