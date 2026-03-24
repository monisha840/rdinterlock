-- AlterTable
ALTER TABLE "client_orders" ADD COLUMN     "extraItems" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "productions" ADD COLUMN     "siteName" TEXT;

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "rate6Inch" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "rate8Inch" DOUBLE PRECISION DEFAULT 0;
