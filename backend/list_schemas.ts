import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schemas: any[] = await prisma.$queryRaw`
    SELECT schema_name 
    FROM information_schema.schemata
  `;
  console.log('Schemas:', schemas.map(s => s.schema_name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
