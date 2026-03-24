/*
  Warnings:

  - You are about to drop the column `categoryId` on the `cash_entries` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the `expense_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `labour_advances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `labour_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `labours` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_workerId_fkey";

-- DropForeignKey
ALTER TABLE "cash_entries" DROP CONSTRAINT "cash_entries_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "cash_entries" DROP CONSTRAINT "cash_entries_workerId_fkey";

-- DropForeignKey
ALTER TABLE "client_orders" DROP CONSTRAINT "client_orders_driverId_fkey";

-- DropForeignKey
ALTER TABLE "daily_wages" DROP CONSTRAINT "daily_wages_workerId_fkey";

-- DropForeignKey
ALTER TABLE "dispatch_schedules" DROP CONSTRAINT "dispatch_schedules_driverId_fkey";

-- DropForeignKey
ALTER TABLE "dispatches" DROP CONSTRAINT "dispatches_driverId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_workerId_fkey";

-- DropForeignKey
ALTER TABLE "labour_advances" DROP CONSTRAINT "labour_advances_labourId_fkey";

-- DropForeignKey
ALTER TABLE "labour_payments" DROP CONSTRAINT "labour_payments_labourId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_settlements" DROP CONSTRAINT "monthly_settlements_workerId_fkey";

-- DropForeignKey
ALTER TABLE "production_workers" DROP CONSTRAINT "production_workers_workerId_fkey";

-- DropForeignKey
ALTER TABLE "weekly_settlements" DROP CONSTRAINT "weekly_settlements_workerId_fkey";

-- DropForeignKey
ALTER TABLE "worker_advances" DROP CONSTRAINT "worker_advances_workerId_fkey";

-- AlterTable
ALTER TABLE "cash_entries" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "client_orders" ADD COLUMN     "handledById" TEXT;

-- AlterTable
ALTER TABLE "dispatches" ADD COLUMN     "handledById" TEXT;

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "transport_entries" ADD COLUMN     "driverId" TEXT;

-- DropTable
DROP TABLE "expense_categories";

-- DropTable
DROP TABLE "labour_advances";

-- DropTable
DROP TABLE "labour_payments";

-- DropTable
DROP TABLE "labours";

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "employeeType" TEXT NOT NULL DEFAULT 'Worker',
    "paymentType" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlySalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyWage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perBrickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "advanceBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_configs" (
    "id" TEXT NOT NULL,
    "brickTypeId" TEXT NOT NULL,
    "cementPer1000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flyAshPer1000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "powderPer1000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_consumption_logs" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_consumption_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brick_returns" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "brickTypeId" TEXT NOT NULL,
    "returnedQuantity" INTEGER NOT NULL,
    "reason" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brick_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_emis" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_emis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_payments" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentType" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "material_configs_brickTypeId_key" ON "material_configs"("brickTypeId");

-- AddForeignKey
ALTER TABLE "production_workers" ADD CONSTRAINT "production_workers_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_orders" ADD CONSTRAINT "client_orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_orders" ADD CONSTRAINT "client_orders_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_schedules" ADD CONSTRAINT "dispatch_schedules_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_configs" ADD CONSTRAINT "material_configs_brickTypeId_fkey" FOREIGN KEY ("brickTypeId") REFERENCES "brick_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumption_logs" ADD CONSTRAINT "material_consumption_logs_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brick_returns" ADD CONSTRAINT "brick_returns_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brick_returns" ADD CONSTRAINT "brick_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brick_returns" ADD CONSTRAINT "brick_returns_brickTypeId_fkey" FOREIGN KEY ("brickTypeId") REFERENCES "brick_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_advances" ADD CONSTRAINT "worker_advances_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_wages" ADD CONSTRAINT "daily_wages_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_settlements" ADD CONSTRAINT "weekly_settlements_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_settlements" ADD CONSTRAINT "monthly_settlements_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_emis" ADD CONSTRAINT "vehicle_emis_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "transport_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_entries" ADD CONSTRAINT "transport_entries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_payments" ADD CONSTRAINT "staff_payments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
