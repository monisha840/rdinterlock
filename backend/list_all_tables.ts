import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const tables: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  const tableNames = tables.map(t => t.table_name);
  fs.writeFileSync('all_tables.json', JSON.stringify(tableNames, null, 2));
  console.log('Listed', tableNames.length, 'tables in all_tables.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
