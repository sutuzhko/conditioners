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
 * Код хранится строкой, а не перечислением базы: правка состава словаря не
 * должна стоить миграции. Неизвестный код отбивает схема Zod на границе.
 */

export const CANCEL_REASONS = [
  'client_refused',
  'no_answer',
  'too_expensive',
  'other_contractor',
  'postponed',
  'our_fault',
  'other',
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];

export function isCancelReason(value: string): value is CancelReason {
  return CANCEL_REASONS.some((reason) => reason === value);
}

const TITLES: Record<CancelReason, string> = {
  client_refused: 'Клиент передумал',
  no_answer: 'Не дозвонились',
  too_expensive: 'Дорого',
  other_contractor: 'Выбрал другого подрядчика',
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
