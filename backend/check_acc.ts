import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const advances = await prisma.workerAdvance.findMany();
  console.log(`Found ${advances.length} advances`);
  
  const wages = await prisma.dailyWage.findMany();
  console.log(`Found ${wages.length} wages`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
