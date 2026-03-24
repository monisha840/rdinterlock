-- DropForeignKey
ALTER TABLE "brick_returns" DROP CONSTRAINT "brick_returns_dispatchId_fkey";

-- AlterTable
ALTER TABLE "brick_returns" ALTER COLUMN "dispatchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "brick_returns" ADD CONSTRAINT "brick_returns_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
