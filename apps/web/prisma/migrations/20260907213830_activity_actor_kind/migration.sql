-- CreateEnum
CREATE TYPE "ActivityActorKind" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "ActivityEvent" ADD COLUMN     "actorKind" "ActivityActorKind" NOT NULL DEFAULT 'USER';

-- 🔴 Перенос уже записанных строк, пока их род ещё выводится.
--
-- Умолчание `USER` верно для каждой строки с автором: удалённой учётной
-- записью не действуют, значит проставленный `actorId` — это всегда действие
-- живой учётки. Строки без автора записаны модерацией из Telegram, где
-- нажимает телеграм-аккаунт, а не учётная запись панели, — это `SYSTEM`.
--
-- Вывести это можно ровно сейчас. Позже обе разновидности нуля станут
-- неразличимы: `SetNull` обнулит `actorId` и у событий уволенных сотрудников,
-- и отделить их от событий без автора будет нечем.
UPDATE "ActivityEvent" SET "actorKind" = 'SYSTEM' WHERE "actorId" IS NULL;
