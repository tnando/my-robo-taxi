-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "keyPairingDeferredAt" TIMESTAMP(3),
ADD COLUMN "keyPairingReminderCount" INTEGER NOT NULL DEFAULT 0;
