import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tables: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'labours'
  `;
  console.log('Found labours table:', tables.length > 0);
  if (tables.length > 0) {
    const labours: any[] = await prisma.$queryRaw`SELECT * FROM labours`;
    console.log(`Found ${labours.length} labours.`);
    if (labours.length > 0) {
      console.log('Sample labour:', JSON.stringify(labours[0], null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
