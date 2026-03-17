import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const attendance = await prisma.attendance.findMany();
  console.log(`Found ${attendance.length} attendance records`);
  
  const orders = await prisma.clientOrder.findMany();
  console.log(`Found ${orders.length} client orders`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
