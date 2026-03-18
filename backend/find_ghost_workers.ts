import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transportDrivers = await prisma.transportEntry.findMany({
    select: { driverName: true, driverId: true },
    distinct: ['driverName']
  });
  console.log('Unique drivers in Transport:', transportDrivers);

  const productionWorkers = await prisma.productionWorker.findMany({
    select: { workerId: true },
    distinct: ['workerId']
  });
  console.log('Worker IDs in Production:', productionWorkers);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
