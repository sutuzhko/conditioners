-- CreateEnum
CREATE TYPE "StockUnit" AS ENUM ('PIECE', 'METER', 'KILOGRAM', 'LITER', 'PAIR', 'PACK', 'COIL', 'ROLL', 'CYLINDER');

-- CreateEnum
CREATE TYPE "StockZoneKind" AS ENUM ('WAREHOUSE', 'VAN');

-- CreateEnum
CREATE TYPE "StockMoveKind" AS ENUM ('INCOME', 'TRANSFER', 'CONSUME', 'RETURN', 'COUNT');

-- CreateTable
CREATE TABLE "StockZone" (
    "id" TEXT NOT NULL,
    "kind" "StockZoneKind" NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,
    "unit" "StockUnit" NOT NULL,
    "minQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "productId" TEXT,
    "note" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "StockMoveKind" NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "fromZoneId" TEXT,
    "toZoneId" TEXT,
    "orderId" TEXT,
    "serials" TEXT,
    "reason" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockZone_archived_kind_sort_idx" ON "StockZone"("archived", "kind", "sort");

-- CreateIndex
CREATE INDEX "StockZone_userId_idx" ON "StockZone"("userId");

-- CreateIndex
CREATE INDEX "StockItem_archived_group_name_idx" ON "StockItem"("archived", "group", "name");

-- CreateIndex
CREATE INDEX "StockItem_productId_idx" ON "StockItem"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_itemId_createdAt_idx" ON "StockMovement"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- AddForeignKey
ALTER TABLE "StockZone" ADD CONSTRAINT "StockZone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_fromZoneId_fkey" FOREIGN KEY ("fromZoneId") REFERENCES "StockZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_toZoneId_fkey" FOREIGN KEY ("toZoneId") REFERENCES "StockZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
