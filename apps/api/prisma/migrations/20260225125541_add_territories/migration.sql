-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'TERRITORY_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'TERRITORY_UPDATED';
ALTER TYPE "AuditEventType" ADD VALUE 'TERRITORY_DELETED';
ALTER TYPE "AuditEventType" ADD VALUE 'TERRITORY_SESSION_STARTED';
ALTER TYPE "AuditEventType" ADD VALUE 'TERRITORY_SESSION_ENDED';

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "polygon" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#4488FF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritorySession" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TerritorySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Territory_number_key" ON "Territory"("number");

-- CreateIndex
CREATE INDEX "TerritorySession_isActive_idx" ON "TerritorySession"("isActive");

-- CreateIndex
CREATE INDEX "TerritorySession_userId_idx" ON "TerritorySession"("userId");

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritorySession" ADD CONSTRAINT "TerritorySession_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritorySession" ADD CONSTRAINT "TerritorySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
