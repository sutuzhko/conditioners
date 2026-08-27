-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "cancelsId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_cancelsId_key" ON "StockMovement"("cancelsId");

