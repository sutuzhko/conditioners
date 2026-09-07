/**
 * Почему отказались — справочник причин отмены (ADR-310).
 *
 * 🔴 Почему словарь живёт в `shared`, а не в сущности. Причина отмены нужна
 * двум сущностям сразу: обращению (`entities/lead`) и наряду
 * (`entities/order`). Импорт вбок между слайсами одного слоя запрещён
 * правилом зависимостей, а две копии словаря разошлись бы на первом же
 * переименовании — ровно тот же случай, что у оформления (`employment`) и
 * пояса работ (`calendar`).
 *
 * 🔴 Справочник, а не свободный текст. Без него «дорого», «Дорого» и
 * «дороговато» — три разные причины, и вкладка отказов не обобщает ничего
 * (ADR-310, отвергнутые варианты). Уточнение свободной строкой при этом
 * остаётся: справочник отвечает на вопрос «почему», строка — «что именно
 * сказал человек».
 *
 * 🔴 Хранится перечислением базы `CancelReason`, одним на обе сущности
 * (ADR-311). Строкой оно хранилось до 7 сентября, и в этом была ошибка:
 * перечисление ловит опечатку на записи, строка — только на чтении, и то если
 * кто-нибудь посмотрит. Слой `shared` при этом про Prisma не знает — здесь
 * лежат те же ключи строками, а соответствие составов держит тест
 * `server/repo/cancel-reason.test.ts`.
 *
 * 🔴 Ключ «выбрал другого» — `chose_other`, а не `other_contractor`. Словарь
 * был заведён дважды двумя подрядчиками по разным issue (#627 и #630), и
 * шесть ключей из семи совпали дословно; разошёлся этот один. Победил
 * короткий: он уже стоял в прогнанной миграции наряда, и переименование
 * стоило бы правки SQL, который накачен (ADR-311).
 */

export const CANCEL_REASONS = [
  'client_refused',
  'no_answer',
  'too_expensive',
  'chose_other',
  'postponed',
  'our_fault',
  'other',
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];

export function isCancelReason(value: string): value is CancelReason {
  return CANCEL_REASONS.some((reason) => reason === value);
}

const TITLES: Record<CancelReason, string> = {
  client_refused: 'Отказ клиента',
  no_answer: 'Не дозвонились',
  too_expensive: 'Дорого',
  chose_other: 'Выбрал другого подрядчика',
  postponed: 'Перенос на потом',
  our_fault: 'Наша ошибка',
  other: 'Другое',
};

export function cancelReasonTitle(reason: CancelReason): string {
  return TITLES[reason];
}

/**
 * Причины списком для поля выбора — в том порядке, в каком они встречаются.
 *
 * «Другое» стоит последним намеренно: оно принимает всё, и стоящее первым
 * оно собрало бы половину отказов, обессмыслив остальные шесть строк.
 */
export const CANCEL_REASON_OPTIONS: readonly {
  readonly value: CancelReason;
  readonly label: string;
}[] = CANCEL_REASONS.map((value) => ({ value, label: TITLES[value] }));

/** Уточнение к причине — не переписка: длинный разбор место в заметке. */
export const CANCEL_NOTE_MAX = 500;
