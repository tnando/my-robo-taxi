-- CreateEnum
CREATE TYPE "SetupStatus" AS ENUM ('pending_pairing', 'pairing_detected', 'config_pushed', 'waiting_connection', 'connected');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "setupStatus" "SetupStatus" NOT NULL DEFAULT 'pending_pairing';
