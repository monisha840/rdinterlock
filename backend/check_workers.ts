import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const workers = await prisma.worker.findMany();
  console.log('--- Workers in DB ---');
  workers.forEach(w => {
    console.log(`ID: ${w.id}, Name: ${w.name}, Role: ${w.role}, EmployeeType: "${w.employeeType}", PaymentType: ${w.paymentType}, IsActive: ${w.isActive}`);
  });
  console.log('--- End ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
