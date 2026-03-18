import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = [
    'attendance', 'dailyWage', 'workerAdvance', 'productionWorker', 
    'weeklySettlement', 'monthlySettlement', 'expense'
  ];

  for (const table of tables) {
    try {
      const records = await (prisma as any)[table].findMany({
        select: { workerId: true },
        distinct: ['workerId']
      });
      console.log(`Unique workerIds in ${table}:`, records.map((r: any) => r.workerId));
    } catch (e: any) {
      // console.log(`Error in ${table}: ${e.message}`);
    }
  }

  const workers = await prisma.worker.findMany({ select: { id: true, name: true } });
  console.log('Workers in table:', workers);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
