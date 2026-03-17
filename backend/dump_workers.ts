import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const workers = await prisma.worker.findMany();
  const output = {
    count: workers.length,
    workers: workers.map(w => ({
      id: w.id,
      name: w.name,
      role: w.role,
      employeeType: w.employeeType,
      paymentType: w.paymentType,
      isActive: w.isActive
    }))
  };
  fs.writeFileSync('worker_dump.json', JSON.stringify(output, null, 2));
  console.log(`Dumped ${workers.length} workers to worker_dump.json`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
