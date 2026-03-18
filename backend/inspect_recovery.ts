import { PrismaClient } from './prisma/recovery-client';

const prisma = new PrismaClient();

async function main() {
  const workers = await prisma.workers.findMany();
  console.log('--- RECOVERY WORKERS (SQLite) ---');
  console.log('Count:', workers.length);
  workers.forEach(w => {
    console.log(JSON.stringify(w));
  });

  const advances = await prisma.worker_advances.findMany();
  console.log('--- RECOVERY ADVANCES (SQLite) ---');
  console.log('Count:', advances.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
