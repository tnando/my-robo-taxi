-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "teslaVehicleId" TEXT,
ADD COLUMN     "vin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_teslaVehicleId_key" ON "Vehicle"("teslaVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");
