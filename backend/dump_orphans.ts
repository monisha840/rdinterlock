import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const advances = await prisma.workerAdvance.findMany();
  const wages = await prisma.dailyWage.findMany();
  const data = { advances, wages };
  fs.writeFileSync('orphan_data.json', JSON.stringify(data, null, 2));
  console.log('Saved orphan_data.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
