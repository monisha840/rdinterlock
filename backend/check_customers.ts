import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany();
  console.log(`Found ${customers.length} customers`);
  if (customers.length > 0) {
    console.log('Sample:', customers[0].name);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
