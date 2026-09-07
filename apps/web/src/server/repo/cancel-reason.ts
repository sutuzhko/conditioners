/**
 * Перевод причины отказа между базой и доменом.
 *
 * Значения словаря в Postgres кричат заглавными, наружу уходят в том виде, в
 * каком их знают домен и контракт. Таблицы вместо `toUpperCase()`: опечатка в
 * ключе — ошибка типов, а не пустое поле в карточке.
 *
 * 🔴 Один модуль на проект, и это прямое следствие ADR-311. Причину отказа
 * читают два репозитория — обращения (`leads`) и наряды (`orders`), — а до
 * 7 сентября словарь был заведён дважды: строкой у заявки и перечислением у
 * наряда, с разными ключами для «выбрал другого». Две копии таблиц разошлись
 * бы снова на первой же новой причине, и хуже всего то, что каждая по
 * отдельности осталась бы верной.
 *
 * Тот же приём и та же причина, что у оформления (`repo/employment`).
 */
import type { CancelReason as DbCancelReason } from '@prisma/client';

import { CANCEL_REASONS, type CancelReason } from '@/shared/lib/cancel-reason';

const FROM_DB: Record<DbCancelReason, CancelReason> = {
  CLIENT_REFUSED: 'client_refused',
  NO_ANSWER: 'no_answer',
  TOO_EXPENSIVE: 'too_expensive',
  CHOSE_OTHER: 'chose_other',
  POSTPONED: 'postponed',
  OUR_FAULT: 'our_fault',
  OTHER: 'other',
};

const TO_DB: Record<CancelReason, DbCancelReason> = {
  client_refused: 'CLIENT_REFUSED',
  no_answer: 'NO_ANSWER',
  too_expensive: 'TOO_EXPENSIVE',
  chose_other: 'CHOSE_OTHER',
  postponed: 'POSTPONED',
  our_fault: 'OUR_FAULT',
  other: 'OTHER',
};

/** `null` остаётся `null`: «не отказывались» — это ответ, а не пропуск. */
export function cancelReasonFromDb(reason: DbCancelReason | null): CancelReason | null {
  return reason === null ? null : FROM_DB[reason];
}

export function cancelReasonToDb(reason: CancelReason | null): DbCancelReason | null {
  return reason === null ? null : TO_DB[reason];
}

/**
 * Составы словаря и перечисления — для теста соответствия.
 *
 * 🔴 Выведены наружу намеренно. `Record<DbCancelReason, …>` ловит только
 * значение, добавленное в перечисление и забытое в таблице; обратного он не
 * видит, а ADR-311 требует держать словарь и перечисление одним целым.
 */
export const CANCEL_REASON_DB_KEYS: readonly string[] = Object.values(TO_DB);
export const CANCEL_REASON_DOMAIN_KEYS: readonly string[] = CANCEL_REASONS;
