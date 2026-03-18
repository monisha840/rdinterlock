import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name ILIKE '%worker%' OR table_name ILIKE '%staff%')
  `;
  console.log('Matching tables:', tables.map(t => t.table_name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
