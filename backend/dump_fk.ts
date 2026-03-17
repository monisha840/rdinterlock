import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.clientOrder.findMany();
  const workers = await prisma.worker.findMany();
  const data = {
    orders: orders.map(o => ({ id: o.id, driverId: o.driverId, handledById: o.handledById })),
    workers: workers.map(w => ({ id: w.id, name: w.name }))
  };
  fs.writeFileSync('fk_debug.json', JSON.stringify(data, null, 2));
  console.log('Saved fk_debug.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
