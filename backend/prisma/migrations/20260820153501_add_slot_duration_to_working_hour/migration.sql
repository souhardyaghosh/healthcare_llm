/*
  Warnings:

  - A unique constraint covering the columns `[doctorId,dayOfWeek]` on the table `WorkingHour` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WorkingHour" ADD COLUMN     "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30;

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHour_doctorId_dayOfWeek_key" ON "WorkingHour"("doctorId", "dayOfWeek");
