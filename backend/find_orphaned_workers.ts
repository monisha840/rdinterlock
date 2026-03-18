import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const attendance = await prisma.attendance.findMany({
    select: { workerId: true },
    distinct: ['workerId']
  });
  console.log('Worker IDs in Attendance:', attendance.map(a => a.workerId));
  
  const workers = await prisma.worker.findMany({
    select: { id: true }
  });
  const workerIds = new Set(workers.map(w => w.id));
  
  const orphaned = attendance.filter(a => !workerIds.has(a.workerId));
  console.log('Orphaned Worker IDs:', orphaned.map(o => o.workerId));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
