import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const workers: any[] = await prisma.$queryRaw`SELECT * FROM workers`;
  fs.writeFileSync('raw_workers_dump.json', JSON.stringify(workers, null, 2));
  console.log('Dumped', workers.length, 'workers to raw_workers_dump.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
