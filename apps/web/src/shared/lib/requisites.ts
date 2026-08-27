/**
 * Проверка российских реквизитов по контрольным разрядам.
 *
 * 🔴 Проверяется арифметика, а не длина строки (PROJECT.md §5.2). ИНН и ОГРН
 * видны в футере и попадают в политику обработки персональных данных: описка
 * в цифре живёт там годами и всплывает при первой же проверке. Контрольный
 * разряд ловит и опечатку, и переставленные цифры — глаз не ловит ни то, ни
 * другое.
 *
 * Функции строгие: строка принимается как есть, пробелы внутри не вычищаются.
 * Приводит значение к цифрам вызывающая схема — иначе «7707 083893» прошло бы
 * проверку здесь и легло бы в базу с пробелом.
 */

/** Строка целиком из арабских цифр — `\d` в JS не пропускает иные системы счисления. */
const ONLY_DIGITS = /^\d+$/;

/**
 * Разряды числа, если строка — ровно `length` цифр. Иначе `null`: длина и
 * состав проверяются один раз здесь, чтобы каждая функция не повторяла это
 * перед своей арифметикой.
 */
function toDigits(value: string, length: number): readonly number[] | null {
  if (value.length !== length || !ONLY_DIGITS.test(value)) return null;

  return Array.from(value, (char) => Number(char));
}

/**
 * Сумма произведений «разряд × вес». Разряды и веса идут парами слева
 * направо, разряды сверх набора весов в счёт не идут: у ИНН физлица два
 * контрольных разряда, и каждый считается по своему набору.
 */
function weightedSum(digits: Iterable<number>, weights: Iterable<number>): number {
  const stream = digits[Symbol.iterator]();
  let sum = 0;

  for (const weight of weights) {
    const digit = stream.next();
    if (digit.done === true) return sum;
    sum += weight * digit.value;
  }

  return sum;
}

/** Контрольный разряд ИНН: остаток по модулю 11, приведённый к одной цифре. */
function innControlDigit(sum: number): number {
  return (sum % 11) % 10;
}

/**
 * Остаток от деления длинного числа, записанного разрядами, — схемой Горнера.
 *
 * 🔴 Не через `Number` и не через `BigInt`. Четырнадцать цифр ОГРНИП в
 * `Number` ещё помещаются, но код, который «пока помещается», — ловушка для
 * следующего, кто добавит проверку на двадцать разрядов: он не упадёт, он
 * молча начнёт врать. Поразрядный счёт от разрядности не зависит вовсе.
 */
function remainderOfDigits(digits: Iterable<number>, modulo: number): number {
  let rest = 0;
  for (const digit of digits) {
    rest = (rest * 10 + digit) % modulo;
  }

  return rest;
}

const INN_COMPANY_WEIGHTS = [2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN_PERSON_WEIGHTS_ELEVENTH = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN_PERSON_WEIGHTS_TWELFTH = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

/** ИНН физического лица и индивидуального предпринимателя — 12 цифр, два контрольных разряда. */
export function isInnPerson(value: string): boolean {
  const digits = toDigits(value, 12);
  if (digits === null) return false;

  const eleventh = innControlDigit(weightedSum(digits, INN_PERSON_WEIGHTS_ELEVENTH));
  const twelfth = innControlDigit(weightedSum(digits, INN_PERSON_WEIGHTS_TWELFTH));

  return digits.at(10) === eleventh && digits.at(11) === twelfth;
}

/** ИНН юридического лица — 10 цифр, один контрольный разряд. */
export function isInnCompany(value: string): boolean {
  const digits = toDigits(value, 10);
  if (digits === null) return false;

  return digits.at(9) === innControlDigit(weightedSum(digits, INN_COMPANY_WEIGHTS));
}

/** ОГРН юридического лица — 13 цифр. */
export function isOgrn(value: string): boolean {
  const digits = toDigits(value, 13);
  if (digits === null) return false;

  const rest = remainderOfDigits(digits.slice(0, 12), 11);

  // остаток бывает двузначным (10), сверяется только его младшая цифра
  return digits.at(12) === rest % 10;
}

/** ОГРНИП индивидуального предпринимателя — 15 цифр. */
export function isOgrnip(value: string): boolean {
  const digits = toDigits(value, 15);
  if (digits === null) return false;

  const rest = remainderOfDigits(digits.slice(0, 14), 13);

  return digits.at(14) === rest % 10;
}

/**
 * Строение КПП: четыре цифры кода налогового органа, два знака кода причины
 * постановки на учёт, три цифры порядкового номера. Буквы в середине —
 * не мусор: коды причины у иностранных организаций буквенные.
 */
const KPP_PATTERN = /^\d{4}[0-9A-Z]{2}\d{3}$/;

/**
 * КПП — 9 знаков. Контрольного разряда у КПП нет, проверяется строение.
 *
 * 🔴 Это не забытая проверка. В отличие от ИНН и ОГРН, КПП контрольного
 * разряда не имеет вообще — в нём нечего пересчитывать, и опечатку в
 * порядковом номере арифметикой не поймать. PROJECT.md §5.2 перечисляет КПП
 * вместе с остальными реквизитами, поэтому расхождение объяснено здесь: всё,
 * что можно проверить машиной, — это длина, позиции цифр и код региона.
 */
export function isKpp(value: string): boolean {
  if (!KPP_PATTERN.test(value)) return false;

  // первые две цифры — код субъекта РФ, нулевого субъекта не существует
  return value.slice(0, 2) !== '00';
}

/** БИК банка — 9 цифр. */
export function isBik(value: string): boolean {
  if (toDigits(value, 9) === null) return false;

  // 04 — код России в справочнике БИК; банк с иным началом здесь не бывает
  return value.startsWith('04');
}

/** Признак корреспондентского счёта в первых трёх разрядах номера. */
const CORR_ACCOUNT_PREFIX = '301';

/** Разрядов в строке, по которой считается контрольный ключ: 3 от БИК плюс 20 счёта. */
const ACCOUNT_KEY_LENGTH = 23;

/** Веса 7-1-3 повторяются по кругу на все разряды ключа. */
function accountWeight(position: number): number {
  const step = position % 3;
  if (step === 0) return 7;
  if (step === 1) return 1;

  return 3;
}

/**
 * Контрольный ключ счёта: сумма младших цифр произведений «разряд × вес»
 * делится на 10 без остатка. Ключ считается вместе с БИК — счёт сам по себе
 * не самодостаточен, и номер, верный в одном банке, в другом неверен.
 */
function hasValidAccountKey(prefix: string, account: string): boolean {
  const digits = toDigits(`${prefix}${account}`, ACCOUNT_KEY_LENGTH);
  if (digits === null) return false;

  const sum = digits.reduce(
    (acc, digit, position) => acc + ((digit * accountWeight(position)) % 10),
    0,
  );

  return sum % 10 === 0;
}

/** Расчётный счёт — 20 цифр, контрольный ключ считается вместе с БИК. */
export function isBankAccount(account: string, bik: string): boolean {
  if (!isBik(bik)) return false;
  if (toDigits(account, 20) === null) return false;

  // счёт на 301 — корреспондентский: у него другой префикс ключа, и принять
  // его здесь значит записать банку в реквизиты не тот счёт
  if (account.startsWith(CORR_ACCOUNT_PREFIX)) return false;

  // для расчётного счёта префикс ключа — последние три цифры БИК
  return hasValidAccountKey(bik.slice(6, 9), account);
}

/** Корреспондентский счёт — 20 цифр, контрольный ключ считается вместе с БИК. */
export function isCorrAccount(account: string, bik: string): boolean {
  if (!isBik(bik)) return false;
  if (toDigits(account, 20) === null) return false;
  if (!account.startsWith(CORR_ACCOUNT_PREFIX)) return false;

  // для корсчёта префикс ключа — ноль и пятая с шестой цифры БИК
  return hasValidAccountKey(`0${bik.slice(4, 6)}`, account);
}
