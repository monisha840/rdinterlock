import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const weekly = await prisma.weeklySettlement.findMany();
  console.log(`Found ${weekly.length} weekly settlements.`);
  weekly.forEach(w => console.log(`Notes: ${w.notes}, workerId: ${w.workerId}`));

  const monthly = await prisma.monthlySettlement.findMany();
  console.log(`Found ${monthly.length} monthly settlements.`);
  monthly.forEach(m => console.log(`Notes: ${m.notes}, workerId: ${m.workerId}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
