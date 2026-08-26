/**
 * Перевод оформления между базой и доменом.
 *
 * Значения словаря в Postgres кричат заглавными, наружу уходят в том виде, в
 * каком их знают домен и контракт. Таблицы вместо `toUpperCase()`: опечатка в
 * ключе — ошибка типов, а не пустое поле в карточке.
 *
 * 🔴 Один модуль на проект. Оформление читают два репозитория — команда
 * (`admin-users`) и наряды (`orders`, ради `installer.employment`), — и две
 * копии таблиц разошлись бы на первом же новом виде отношений: одна половина
 * панели показывала бы его, другая падала на неизвестном ключе.
 */
import type { Employment as DbEmployment } from '@prisma/client';

import type { Employment } from '@/shared/lib/employment';

const FROM_DB: Record<DbEmployment, Employment> = {
  SELF_EMPLOYED: 'self_employed',
  CONTRACT: 'contract',
  STAFF: 'staff',
};

const TO_DB: Record<Employment, DbEmployment> = {
  self_employed: 'SELF_EMPLOYED',
  contract: 'CONTRACT',
  staff: 'STAFF',
};

/** `null` остаётся `null`: «оформление не заведено» — это ответ, а не пропуск. */
export function employmentFromDb(employment: DbEmployment | null): Employment | null {
  return employment === null ? null : FROM_DB[employment];
}

export function employmentToDb(employment: Employment | null): DbEmployment | null {
  return employment === null ? null : TO_DB[employment];
}
