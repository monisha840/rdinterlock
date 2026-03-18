import { PrismaClient } from './prisma/recovery-client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SQLite Table Counts ---');
  const tables = [
    'workers', 'attendance', 'brick_types', 'cash_entries', 'customers', 
    'daily_wages', 'dispatches', 'expenses', 'machines', 'material_usages', 
    'production_workers', 'productions', 'raw_materials', 'users', 
    'weekly_settlements', 'worker_advances'
  ];

  for (const table of tables) {
    try {
      const count = await (prisma as any)[table].count();
      console.log(`${table}: ${count}`);
    } catch (e: any) {
      console.log(`${table}: Error - ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
