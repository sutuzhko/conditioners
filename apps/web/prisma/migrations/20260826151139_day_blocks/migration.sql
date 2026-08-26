-- CreateEnum
CREATE TYPE "BlockRepeat" AS ENUM ('ONCE', 'WEEKLY');

-- CreateTable
CREATE TABLE "DayBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repeat" "BlockRepeat" NOT NULL DEFAULT 'ONCE',
    "day" TIMESTAMP(3),
    "weekday" INTEGER,
    "fromMin" INTEGER,
    "toMin" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayBlock_userId_day_idx" ON "DayBlock"("userId", "day");

-- CreateIndex
CREATE INDEX "DayBlock_userId_repeat_idx" ON "DayBlock"("userId", "repeat");

-- AddForeignKey
ALTER TABLE "DayBlock" ADD CONSTRAINT "DayBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
