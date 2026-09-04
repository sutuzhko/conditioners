-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
