-- CreateEnum
CREATE TYPE "CrmEventKind" AS ENUM ('CALL', 'MEASURE', 'INSTALL', 'SERVICE', 'MEETING', 'NOTE');

-- CreateEnum
CREATE TYPE "CrmEventStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "CrmEvent" (
    "id" TEXT NOT NULL,
    "kind" "CrmEventKind" NOT NULL,
    "status" "CrmEventStatus" NOT NULL DEFAULT 'PLANNED',
    "at" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmEvent_at_idx" ON "CrmEvent"("at");

-- CreateIndex
CREATE INDEX "CrmEvent_leadId_idx" ON "CrmEvent"("leadId");

-- AddForeignKey
ALTER TABLE "CrmEvent" ADD CONSTRAINT "CrmEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
