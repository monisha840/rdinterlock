import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Direct SQL Count ---');
  try {
    const workerCount: any[] = await prisma.$queryRaw`SELECT count(*) as count FROM workers`;
    console.log('Workers table count (SQL):', workerCount[0].count);
  } catch (e: any) {
    console.log('Error querying workers table directly:', e.message);
  }

  try {
    const advCount: any[] = await prisma.$queryRaw`SELECT count(*) as count FROM worker_advances`;
    console.log('WorkerAdvances table count (SQL):', advCount[0].count);
  } catch (e: any) {
    console.log('Error querying worker_advances table directly:', e.message);
  }

  console.log('--- Prisma Model Counts ---');
  const wCount = await prisma.worker.count();
  console.log('Worker model count (Prisma):', wCount);

  const aCount = await prisma.workerAdvance.count();
  console.log('WorkerAdvance model count (Prisma):', aCount);

  if (wCount > 0) {
    const firstFive = await prisma.worker.findMany({ take: 5 });
    console.log('First 5 workers:', JSON.stringify(firstFive, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
