import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dispatches = await prisma.dispatch.findMany();
  console.log(`Found ${dispatches.length} dispatches`);
  if (dispatches.length > 0) {
    console.log('Sample driverId:', dispatches[0].driverId);
    console.log('Sample handledById:', dispatches[0].handledById);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
