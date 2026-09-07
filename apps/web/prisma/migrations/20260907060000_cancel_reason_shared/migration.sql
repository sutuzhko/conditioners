-- Один справочник причин отказа на заявку и наряд (ADR-311, issue #638).

-- 1. Перечисление становится общим — одним на обе сущности. Переименование, а
--    не новый тип: колонка наряда этого типа уже заполнена, и пересоздание
--    стоило бы перезаписи всех её значений без единой причины.
ALTER TYPE "OrderCancelReason" RENAME TO "CancelReason";

-- 2. Нераспознанные коды заявки не пропадают молча. Лежать в колонке они
--    могли годами: репозиторий гасил незнакомое значение в NULL на чтении
--    (`server/repo/leads.ts`), и такой отказ выглядел на экране просто
--    отказом без причины. Прежде чем колонка станет перечислением, исходная
--    строка уходит в уточнение — там её прочитает человек.
UPDATE "Lead"
SET "cancelNote" =
      CASE
        WHEN "cancelNote" IS NULL OR "cancelNote" = '' THEN ''
        ELSE "cancelNote" || ' · '
      END
      || 'причина до перевода справочника: ' || "cancelReason"
WHERE "cancelReason" IS NOT NULL
  AND "cancelReason" NOT IN (
    'client_refused', 'no_answer', 'too_expensive', 'other_contractor',
    'postponed', 'our_fault', 'other'
  );

-- 3. Колонка заявки переходит со строки на перечисление. Приведение явное и
--    построчное, а не «что не подошло, то OTHER» (ADR-311): шесть ключей
--    словарей совпадали дословно, а `other_contractor` — тот самый седьмой,
--    которым словарь заявки расходился со словарём наряда. Он и становится
--    `CHOSE_OTHER`.
ALTER TABLE "Lead"
  ALTER COLUMN "cancelReason" TYPE "CancelReason"
  USING CASE "cancelReason"
    WHEN 'client_refused'   THEN 'CLIENT_REFUSED'::"CancelReason"
    WHEN 'no_answer'        THEN 'NO_ANSWER'::"CancelReason"
    WHEN 'too_expensive'    THEN 'TOO_EXPENSIVE'::"CancelReason"
    WHEN 'other_contractor' THEN 'CHOSE_OTHER'::"CancelReason"
    WHEN 'postponed'        THEN 'POSTPONED'::"CancelReason"
    WHEN 'our_fault'        THEN 'OUR_FAULT'::"CancelReason"
    WHEN 'other'            THEN 'OTHER'::"CancelReason"
    ELSE NULL
  END;
