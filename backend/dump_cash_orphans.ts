import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.cashEntry.findMany({
    where: { NOT: { workerId: null } }
  });
  fs.writeFileSync('cash_orphans.json', JSON.stringify(entries, null, 2));
  console.log(`Saved ${entries.length} cash entries to cash_orphans.json`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
