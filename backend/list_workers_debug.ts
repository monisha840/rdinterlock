import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workers = await prisma.worker.findMany();
  console.log('--- ALL WORKERS ---');
  workers.forEach(w => {
    console.log(JSON.stringify({
      id: w.id,
      name: w.name,
      employeeType: w.employeeType,
      isActive: w.isActive,
      paymentType: w.paymentType,
      role: w.role
    }));
  });
  console.log('--- END ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
