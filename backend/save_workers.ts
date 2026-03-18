import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const workers = await prisma.worker.findMany();
  const data = {
    count: workers.length,
    workers: workers.map(w => ({
      id: w.id,
      name: w.name,
      employeeType: w.employeeType,
      isActive: w.isActive,
      paymentType: w.paymentType,
      role: w.role,
      monthlySalary: w.monthlySalary,
      rate: w.rate
    }))
  };
  fs.writeFileSync('workers_data.json', JSON.stringify(data, null, 2));
  console.log('Saved 21 workers to workers_data.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
