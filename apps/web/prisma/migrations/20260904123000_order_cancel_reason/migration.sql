-- CreateEnum
CREATE TYPE "OrderCancelReason" AS ENUM ('CLIENT_REFUSED', 'NO_ANSWER', 'TOO_EXPENSIVE', 'CHOSE_OTHER', 'POSTPONED', 'OUR_FAULT', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" "OrderCancelReason",
ADD COLUMN     "cancelNote" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- Безопасное умолчание для отказов, заведённых до появления поля (ADR-310).
-- Причины у них не существует, и выдумывать её нельзя — «другое» ровно это и
-- означает. Дата отказа берётся из `updatedAt`: у отменённого наряда это
-- последняя правка, то есть чаще всего сам отказ. Приближение одноразовое и
-- касается только строк, которые старше колонки.
UPDATE "Order"
SET "cancelReason" = 'OTHER',
    "cancelledAt" = "updatedAt"
WHERE "status" = 'CANCELLED';
