import { LEAD_ANCHOR } from './nav';

/**
 * Предмет, ради которого нажали кнопку, едет к форме заявки в адресе:
 * `/?model=<слаг>&topic=<ключ>#lead` (ADR-129). Кнопка у модели, кнопка
 * калькулятора и кнопка сервиса ведут в одну и ту же форму, но приводят её
 * заполненной по-разному.
 *
 * 🔴 Почему адрес, а не клиентское состояние: ссылку пересылают и
 * перезагружают, и она обязана открывать ту же заполненную форму. Клиентский
 * снимок контекста (`features/lead-form/context`) решает другую задачу — он
 * невидимый след того, что человек делал, и остаётся на месте (ADR-133).
 *
 * 🔴 Значения параметров английские (инвариант 17): русская тема «Монтаж и
 * установка» в адресной строке превратилась бы в процентную кашу, а
 * транслитерация запрещена.
 */

/**
 * Якорь секции заявки без решётки: объект адреса ждёт `hash` именно так.
 * Берётся из карты навигации, а не пишется второй раз: якорь один на проект.
 */
const LEAD_HASH = LEAD_ANCHOR.slice(1);

/** Имена параметров. Одно место: их знают и форма, и `Clean-param` в robots.txt. */
export const LEAD_PARAMS = {
  model: 'model',
  topic: 'topic',
} as const;

/**
 * Темы обращения: английский ключ для адреса, русская подпись для человека и
 * для владельца в карточке заявки.
 *
 * 🔴 Ключ — часть адреса, и переименовать его молча нельзя: ссылки уже
 * разосланы, а по чужому ключу форма откроется с темой по умолчанию.
 */
export const LEAD_TOPICS = [
  { key: 'install', title: 'Монтаж и установка' },
  { key: 'service', title: 'Сервис и ремонт' },
  { key: 'maintenance', title: 'ТО и чистка' },
  { key: 'consult', title: 'Консультация' },
] as const;

export type LeadTopicKey = (typeof LEAD_TOPICS)[number]['key'];
export type LeadTopic = (typeof LEAD_TOPICS)[number]['title'];

/**
 * Тема по умолчанию — самая общая из списка: человек ещё ничего не выбирал,
 * и форма не вправе догадываться за него о виде работ.
 */
export const DEFAULT_LEAD_TOPIC: LeadTopic = 'Консультация';

/**
 * Ключ из адреса → подпись темы. Неизвестный ключ молча даёт `undefined`:
 * адрес правят руками и присылают друг другу, и опечатка в нём — повод
 * открыть обычную форму, а не показать отказ (ADR-129).
 */
export function leadTopicByKey(key: string | undefined): LeadTopic | undefined {
  return LEAD_TOPICS.find((topic) => topic.key === key)?.title;
}

/** Предмет кнопки: модель, у которой она стоит, и смысл самой кнопки. */
export interface LeadSubject {
  /** Слаг модели: `?model=split-09`. Названия и цены в адрес не едут. */
  readonly model?: string | undefined;
  readonly topic?: LeadTopicKey | undefined;
}

/**
 * Адрес формы с предметом. Объектом, а не строкой: `typedRoutes` проверяет
 * `pathname`, а собранная конкатенацией строка проверку обходит — этим же
 * способом ссылки каталога строятся с самого начала (ADR-109).
 *
 * Путь всегда от корня: те же кнопки стоят на страницах каталога и модели,
 * откуда голый якорь вёл бы в никуда.
 */
export function leadHref(subject: LeadSubject = {}): {
  readonly pathname: '/';
  readonly query: Record<string, string>;
  readonly hash: string;
} {
  const query: Record<string, string> = {};
  if (subject.model !== undefined && subject.model !== '') query[LEAD_PARAMS.model] = subject.model;
  if (subject.topic !== undefined) query[LEAD_PARAMS.topic] = subject.topic;

  return { pathname: '/', query, hash: LEAD_HASH };
}
