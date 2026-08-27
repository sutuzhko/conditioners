-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "context" JSONB;

-- CreateTable
CREATE TABLE "ClientUnit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL,
    "warrantyUntil" TIMESTAMP(3),
    "photo" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientUnit_clientId_installedAt_idx" ON "ClientUnit"("clientId", "installedAt");

-- AddForeignKey
ALTER TABLE "ClientUnit" ADD CONSTRAINT "ClientUnit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
