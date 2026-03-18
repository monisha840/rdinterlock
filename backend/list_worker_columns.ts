import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const columns: any[] = await prisma.$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'workers'
        `);
        console.log('Columns for workers:', columns);
    } catch (e: any) {
        console.error('Error fetching columns:', e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
