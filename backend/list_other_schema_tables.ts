import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const schemas = ['pg_temp_21', 'pg_toast_temp_21'];
    for (const schema of schemas) {
        try {
            const tables: any[] = await prisma.$queryRawUnsafe(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = '${schema}'
            `);
            console.log(`Tables in ${schema}:`, tables.map(t => t.table_name));
        } catch (e: any) {
            console.log(`Error in schema ${schema}: ${e.message}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
