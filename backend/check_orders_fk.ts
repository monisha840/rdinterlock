import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.clientOrder.findMany();
  console.log('--- Client Orders ---');
  orders.forEach(o => {
    console.log(`ID: ${o.id}, driverId: ${o.driverId}, handledById: ${o.handledById}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
