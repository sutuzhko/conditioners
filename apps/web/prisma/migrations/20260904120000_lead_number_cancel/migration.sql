-- Номер обращения и разбор отказа (ADR-310, issue #600, #630).

-- 1. Колонки. `number` заводится необязательной: существующие строки её ещё
--    не имеют, а таблица непустая на любом работающем стенде.
ALTER TABLE "Lead" ADD COLUMN "number" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "cancelReason" TEXT;
ALTER TABLE "Lead" ADD COLUMN "cancelNote" TEXT;

-- 2. Нумерация прошлого: по возрастанию времени обращения, чтобы номер рос
--    вместе с очередью, а не раздавался в случайном порядке.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS seq
  FROM "Lead"
)
UPDATE "Lead"
SET "number" = ordered.seq
FROM ordered
WHERE "Lead"."id" = ordered."id";

-- 3. Теперь колонка обязательна и уникальна.
ALTER TABLE "Lead" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "Lead_number_key" ON "Lead"("number");

-- 4. Счётчик продолжает с последнего выданного номера. `Setting.value` —
--    JSON, поэтому число приводится к нему явно.
INSERT INTO "Setting" ("key", "value", "updatedAt")
SELECT 'leadSeq', to_jsonb(COALESCE(MAX("number"), 0)), NOW() FROM "Lead"
ON CONFLICT ("key") DO NOTHING;
