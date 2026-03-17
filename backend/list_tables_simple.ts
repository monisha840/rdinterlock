import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tables: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log('--- ALL TABLES ---');
  console.log(JSON.stringify(tables.map(t => t.table_name), null, 2));
  console.log('--- END ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
