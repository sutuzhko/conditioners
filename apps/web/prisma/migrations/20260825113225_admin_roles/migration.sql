-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'INSTALLER');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE "InstallerNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallerNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallerNote_userId_createdAt_idx" ON "InstallerNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminUser_role_active_idx" ON "AdminUser"("role", "active");

-- AddForeignKey
ALTER TABLE "InstallerNote" ADD CONSTRAINT "InstallerNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
