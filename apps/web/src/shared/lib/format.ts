/**
 * Форматирование чисел, телефонов и дат.
 *
 * Всё, что попадает в вёрстку, форматируется здесь и только здесь: цена в
 * карточке, в таблице цен и в калькуляторе обязана выглядеть одинаково,
 * иначе «честная цена» рассыпается на три разных написания.
 */

/** Неразрывный пробел: разряды и знак рубля не должны переноситься по строке. */
const NBSP = '\u00A0';

const RU_NUMBER = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/**
 * Разряды в ru-RU разделяются неразрывным пробелом, но конкретный символ
 * зависит от версии ICU. Приводим к одному виду сами, чтобы серверный и
 * клиентский рендер не разошлись на невидимом символе.
 */
function withNbsp(value: string): string {
  return value.replace(/\s/g, NBSP);
}

/** Целое число с разделением разрядов: `38 500`. */
export function formatNumber(value: number): string {
  return withNbsp(RU_NUMBER.format(value));
}

/** Цена с рублём: `38 500 ₽`. Копейки на этом сайте не встречаются. */
export function formatMoney(value: number): string {
  return `${formatNumber(value)}${NBSP}₽`;
}

/**
 * Температура со знаком: `+27 °C`, `−3 °C`, `0 °C`.
 *
 * Минус — типографский U+2212, а не дефис: дефис в этой позиции читается как
 * перенос и рвётся при переносе строки.
 */
export function formatCelsius(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded)}${NBSP}°C`;
}

/** Только цифры телефона; ведущая «8» приводится к «7». */
function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

/**
 * Человеческий вид телефона: `+7 (900) 123-45-67` для мобильного,
 * `+7 (4872) 12-34-56` для городского.
 *
 * Длина кода в российском плане нумерации не фиксирована, поэтому она либо
 * задаётся явно, либо определяется по правилу «мобильные начинаются с 9».
 * Для областных городов, включая Тулу, код четырёхзначный — это свойство
 * нумерации, а не данные компании.
 *
 * Нераспознанный номер возвращается дословно: телефон приходит из админки, и
 * лучше показать его как есть, чем изуродовать.
 */
export function formatPhone(phone: string, areaCodeLength?: number): string {
  const digits = phoneDigits(phone);
  if (digits.length !== 11 || !digits.startsWith('7')) return phone.trim();

  const national = digits.slice(1);
  const codeLength = areaCodeLength ?? (national.startsWith('9') ? 3 : 4);
  const code = national.slice(0, codeLength);
  const rest = national.slice(codeLength);

  const tail =
    rest.length === 7
      ? `${rest.slice(0, 3)}-${rest.slice(3, 5)}-${rest.slice(5)}`
      : `${rest.slice(0, 2)}-${rest.slice(2, 4)}-${rest.slice(4)}`;

  return `+7${NBSP}(${code})${NBSP}${tail}`;
}

/** Значение для `href="tel:"`: только плюс и цифры. */
export function phoneHref(phone: string): string {
  const digits = phoneDigits(phone);
  return digits.length > 0 ? `tel:+${digits}` : `tel:${phone.trim()}`;
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Часовой пояс фиксирован сознательно. Даты статей и периодов скидок хранятся
 * как календарные (полночь UTC); если позволить форматировать их в поясе
 * читателя, серверный и клиентский HTML разойдутся на сутки.
 */
const DISPLAY_TIME_ZONE = 'UTC';

/**
 * Дата для человека: `12 мая 2026`. Без «г.» — так в макете.
 */
export function formatDate(value: Date | string | number, timeZone = DISPLAY_TIME_ZONE): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).formatToParts(date);

  const take = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${take('day')} ${take('month')} ${take('year')}`;
}

/** Дата для `datetime` и JSON-LD: `2026-05-12`. */
export function formatDateIso(value: Date | string | number, timeZone = DISPLAY_TIME_ZONE): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(date);

  const take = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${take('year')}-${take('month')}-${take('day')}`;
}
