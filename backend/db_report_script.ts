import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const report: any = {};
  
  try {
    const sqlCount: any[] = await prisma.$queryRaw`SELECT count(*) as count FROM workers`;
    report.sqlWorkerCount = Number(sqlCount[0].count);
  } catch (e: any) {
    report.sqlWorkerError = e.message;
  }

  try {
    report.prismaWorkerCount = await prisma.worker.count();
  } catch (e: any) {
    report.prismaWorkerError = e.message;
  }

  try {
    const sqlAdvCount: any[] = await prisma.$queryRaw`SELECT count(*) as count FROM worker_advances`;
    report.sqlAdvanceCount = Number(sqlAdvCount[0].count);
  } catch (e: any) {
    report.sqlAdvanceError = e.message;
  }

  try {
    report.prismaAdvanceCount = await prisma.workerAdvance.count();
  } catch (e: any) {
    report.prismaAdvanceError = e.message;
  }

  fs.writeFileSync('db_report.json', JSON.stringify(report, null, 2));
  console.log('DB Report saved to db_report.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
