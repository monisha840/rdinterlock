-- CreateTable
CREATE TABLE "transport_vehicles" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "driverName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "transportType" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vendorId" TEXT,
    "driverName" TEXT,
    "loads" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "expenseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dieselCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentPerLoad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incomeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "dispatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transport_vehicles_vehicleNumber_key" ON "transport_vehicles"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "transport_vendors_name_key" ON "transport_vendors"("name");

-- AddForeignKey
ALTER TABLE "transport_entries" ADD CONSTRAINT "transport_entries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "transport_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_entries" ADD CONSTRAINT "transport_entries_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "transport_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
