import { phoneKey } from './phone';

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
 * Хвост после числа в полосе цифр: `+` приклеивается вплотную (`1200+`),
 * слово отделяется неразрывным пробелом (`3 года`).
 *
 * 🔴 Пробел ставит код, а не владелец. Схема настроек обрезает значения по
 * краям — иначе случайный пробел в поле уезжает на страницу, — и введённое
 * « года» приходило сюда без пробела, давая «3года». Требовать от владельца
 * помнить про пробел, который система молча удаляет, нельзя.
 *
 * Неразрывный пробел, а не обычный: «3 года» — одна величина, и перенос
 * строки между числом и словом её разрывает.
 */
export function formatSuffix(suffix: string | undefined): string {
  const value = suffix?.trim() ?? '';
  if (value === '') return '';

  // буква или цифра в начале — это слово («года», «дня»), ему нужен пробел;
  // «+», «%», «°» и прочие знаки стоят вплотную к числу
  return /^[\p{L}\p{N}]/u.test(value) ? `${NBSP}${value}` : value;
}

/**
 * Температура со знаком: `+27°`, `−3°`, `0°`.
 *
 * Минус — типографский U+2212, а не дефис: дефис в этой позиции читается как
 * перенос и рвётся при переносе строки. Единицы не пишутся: в чипе погоды
 * рядом стоят два значения и текст, и «°C» дважды растягивает строку на
 * лишний перенос (макет, «HERO»).
 */
export function formatDegrees(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded)}°`;
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
  const digits = phoneKey(phone);
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
  const digits = phoneKey(phone);
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

/**
 * Часовой пояс, в котором работает админка.
 *
 * Даты публичных страниц календарные (полночь UTC) и форматируются в UTC —
 * см. `DISPLAY_TIME_ZONE`. В админке даты другие: это моменты событий —
 * когда пришла заявка, когда дано согласие, когда оставлен отзыв. Их владелец
 * сверяет со своим днём в Туле, а не с поясом браузера, из которого смотрит.
 */
export const ADMIN_TIME_ZONE = 'Europe/Moscow';

/** Дата колонкой: `12.05.2026`. Списки админки читают глазами по вертикали. */
export function formatDateShort(value: Date | string | number, timeZone = ADMIN_TIME_ZONE): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Дата с временем: `12.05.2026, 14:30`. Нужна там, где важен не день, а
 * момент: во сколько пришла заявка и когда именно дано согласие по 152-ФЗ.
 */
export function formatDateTime(value: Date | string | number, timeZone = ADMIN_TIME_ZONE): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
