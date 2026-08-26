-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "email" TEXT,
ADD COLUMN     "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "address" TEXT,
ADD COLUMN     "recipientId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
