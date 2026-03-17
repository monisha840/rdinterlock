import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tables: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log('--- Tables ---');
  tables.forEach(t => console.log(t.table_name));
  
  const workerCols: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'workers'
  `;
  console.log('--- Worker Columns ---');
  workerCols.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));
  console.log('--- End ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
