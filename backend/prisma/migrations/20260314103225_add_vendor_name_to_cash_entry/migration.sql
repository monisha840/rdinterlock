-- AlterTable
ALTER TABLE "cash_entries" ADD COLUMN     "vendorName" TEXT;

-- AlterTable
ALTER TABLE "client_orders" ADD COLUMN     "driverId" TEXT;

-- AlterTable
ALTER TABLE "dispatch_schedules" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "dispatches" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "worker_advances" ADD COLUMN     "paymentMode" TEXT NOT NULL DEFAULT 'CASH';

-- AddForeignKey
ALTER TABLE "client_orders" ADD CONSTRAINT "client_orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_schedules" ADD CONSTRAINT "dispatch_schedules_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "client_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "client_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
