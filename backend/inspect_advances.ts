import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const advCols: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'worker_advances'
    ORDER BY column_name
  `;
  console.log('--- WorkerAdvance Columns ---');
  advCols.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));
  
  const advances = await prisma.workerAdvance.findMany();
  console.log('--- Advances Data ---');
  console.log(JSON.stringify(advances, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
