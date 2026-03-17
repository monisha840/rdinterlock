import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cashEntries = await prisma.cashEntry.findMany({
    where: {
      OR: [
        { description: { contains: 'ffba83c7' } },
        { description: { contains: '542d91c9' } },
        { description: { contains: '00bb5c21' } },
        { notes: { contains: 'ffba83c7' } },
        { notes: { contains: '542d91c9' } },
        { notes: { contains: '00bb5c21' } }
      ]
    }
  });
  console.log('--- Cash Entries with Orphan IDs ---');
  cashEntries.forEach(e => {
    console.log(`Desc: ${e.description}, Note: ${e.notes}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
