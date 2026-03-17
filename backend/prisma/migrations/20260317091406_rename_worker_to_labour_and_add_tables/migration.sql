/*
  Warnings:

  - You are about to drop the `workers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_workerId_fkey";

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
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_workerId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_settlements" DROP CONSTRAINT "monthly_settlements_workerId_fkey";

-- DropForeignKey
ALTER TABLE "production_workers" DROP CONSTRAINT "production_workers_workerId_fkey";

-- DropForeignKey
ALTER TABLE "weekly_settlements" DROP CONSTRAINT "weekly_settlements_workerId_fkey";

-- DropForeignKey
ALTER TABLE "worker_advances" DROP CONSTRAINT "worker_advances_workerId_fkey";

-- AlterTable
ALTER TABLE "cash_entries" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "categoryId" TEXT;

-- DropTable
DROP TABLE "workers";

-- CreateTable
CREATE TABLE "labours" (
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
    "phone" TEXT,
    "advanceBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_payments" (
    "id" TEXT NOT NULL,
    "labourId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labour_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_advances" (
    "id" TEXT NOT NULL,
    "labourId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labour_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- AddForeignKey
ALTER TABLE "production_workers" ADD CONSTRAINT "production_workers_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_orders" ADD CONSTRAINT "client_orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "labours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_schedules" ADD CONSTRAINT "dispatch_schedules_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "labours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "labours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_payments" ADD CONSTRAINT "labour_payments_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_advances" ADD CONSTRAINT "labour_advances_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_advances" ADD CONSTRAINT "worker_advances_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_wages" ADD CONSTRAINT "daily_wages_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_settlements" ADD CONSTRAINT "weekly_settlements_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_settlements" ADD CONSTRAINT "monthly_settlements_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "labours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
