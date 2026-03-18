import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workers = await prisma.worker.findMany();
  console.log('Total workers/staff found:', workers.length);
  workers.forEach(w => {
    console.log(`ID: ${w.id}, Name: ${w.name}, Type: ${w.employeeType}, Active: ${w.isActive}, Role: ${w.role}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
