/**
 * Склонение названия города в предложный падеж: «Тула» → «в Туле».
 *
 * Нужно затем, что шаблоны заголовков из docs/SEO.md §3 требуют «в <городе>»,
 * а город хранится в настройках в именительном падеже — как его сверяет
 * Яндекс.Бизнес (инвариант 8). Держать в базе два написания одного города
 * значит завести второй источник NAP-данных, который однажды разойдётся
 * с первым.
 *
 * Правила покрывают однословные названия — их подавляющее большинство, включая
 * все города Тульской области. Названия с дефисом («Ростов-на-Дону») остаются
 * без изменений: универсального правила для них нет, а исказить название в
 * заголовке выдачи хуже, чем оставить его в именительном падеже.
 */

const CONSONANTS = 'бвгджзклмнпрстфхцчшщ';

function declineWord(word: string): string {
  const lower = word.toLowerCase();

  // прилагательные в составе названия: «Нижний» → «Нижнем», «Грозный» → «Грозном»
  if (lower.endsWith('ий')) return `${word.slice(0, -2)}ем`;
  if (lower.endsWith('ый') || lower.endsWith('ой')) return `${word.slice(0, -2)}ом`;

  // «Азия» → «Азии»: у основы на «и» окончание другое, чем у «Тула» → «Туле»
  if (lower.endsWith('ия')) return `${word.slice(0, -2)}ии`;
  if (lower.endsWith('а') || lower.endsWith('я')) return `${word.slice(0, -1)}е`;

  // мужской род на «-ль» склоняется как «Ярославль» → «Ярославле»,
  // остальные на мягкий знак — как женский «Тверь» → «Твери»
  if (lower.endsWith('ль') || lower.endsWith('й')) return `${word.slice(0, -1)}е`;
  if (lower.endsWith('ь')) return `${word.slice(0, -1)}и`;

  const last = lower.slice(-1);
  if (CONSONANTS.includes(last)) return `${word}е`;

  // «Сочи», «Иваново», «Баку» — несклоняемые в современной норме
  return word;
}

/**
 * Название города в предложном падеже. Пустая строка остаётся пустой: город
 * не заполнен, и подставлять вместо него что-либо нельзя.
 */
export function cityPrepositional(city: string): string {
  const trimmed = city.trim();
  if (trimmed === '' || trimmed.includes('-')) return trimmed;

  return trimmed
    .split(/\s+/)
    .map((word) => declineWord(word))
    .join(' ');
}

/**
 * Готовый хвост «в Туле» для подстановки в заголовок. Города нет — нет и
 * хвоста: заголовок остаётся грамматически целым, просто без географии.
 */
export function inCity(city: string): string {
  const declined = cityPrepositional(city);
  return declined === '' ? '' : ` в ${declined}`;
}
