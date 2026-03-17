import { PrismaClient as RecoveryClient } from './prisma/recovery-client';

async function main() {
  const recovery = new RecoveryClient();
  const tables = [
    'attendance', 'brick_types', 'cash_entries', 'customers', 
    'daily_wages', 'dispatches', 'expenses', 'machines', 
    'material_usages', 'production_workers', 'productions', 
    'raw_materials', 'users', 'weekly_settlements', 
    'worker_advances', 'workers'
  ];
  
  console.log('--- Row Counts in dev.db ---');
  for (const table of tables) {
    try {
      const count: any[] = await recovery.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${count[0].count}`);
    } catch (e) {
      // console.log(`${table}: Error`);
    }
  }
  await recovery.$disconnect();
}

main();
