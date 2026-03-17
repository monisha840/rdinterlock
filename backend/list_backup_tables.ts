import { PrismaClient as RecoveryClient } from './prisma/recovery-client';

async function main() {
  const recovery = new RecoveryClient();
  try {
    const tables: any[] = await recovery.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('--- Tables in dev.db ---');
    console.log(JSON.stringify(tables.map(t => t.name), null, 2));
  } catch (error) {
    console.error('Error listing tables:', error);
  } finally {
    await recovery.$disconnect();
  }
}

main();
