-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('INSTALL', 'SERVICE', 'REPAIR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('COMPANY', 'CASH_TO_INSTALLER');

-- CreateEnum
CREATE TYPE "OrderEquip" AS ENUM ('CONDITIONER', 'FRIDGE', 'COMPRESSOR', 'VENTILATION', 'HEAT_CURTAIN', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitSource" AS ENUM ('OURS', 'CLIENT');

-- CreateEnum
CREATE TYPE "Employment" AS ENUM ('SELF_EMPLOYED', 'CONTRACT', 'STAFF');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "employment" "Employment";

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "clientId" TEXT NOT NULL,
    "installerId" TEXT,
    "at" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 120,
    "address" TEXT NOT NULL,
    "intercom" TEXT,
    "phone2" TEXT,
    "floor" INTEGER,
    "heightWorks" BOOLEAN NOT NULL DEFAULT false,
    "payment" "PaymentMode" NOT NULL DEFAULT 'COMPANY',
    "price" INTEGER NOT NULL DEFAULT 0,
    "installerFee" INTEGER NOT NULL DEFAULT 0,
    "deductionSum" INTEGER NOT NULL DEFAULT 0,
    "deductionReason" TEXT,
    "comment" TEXT,
    "ownerNote" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderUnit" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "equip" "OrderEquip" NOT NULL DEFAULT 'CONDITIONER',
    "model" TEXT,
    "source" "UnitSource" NOT NULL DEFAULT 'OURS',
    "trassaM" INTEGER,
    "diameter" TEXT,
    "shtrob" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_status_at_idx" ON "Order"("status", "at");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_installerId_at_idx" ON "Order"("installerId", "at");

-- CreateIndex
CREATE INDEX "Order_at_idx" ON "Order"("at");

-- CreateIndex
CREATE INDEX "OrderUnit_orderId_sort_idx" ON "OrderUnit"("orderId", "sort");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderUnit" ADD CONSTRAINT "OrderUnit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
