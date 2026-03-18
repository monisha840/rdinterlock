import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const allIds = new Set<string>();
    const tables = [
        'attendance', 'daily_wages', 'worker_advances', 'production_workers',
        'weekly_settlements', 'monthly_settlements', 'expenses', 'cash_entries',
        'dispatches', 'client_orders', 'transport_entries'
    ];

    for (const table of tables) {
        try {
            const columns: any[] = await prisma.$queryRawUnsafe(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${table}' 
                AND (column_name ILIKE '%workerid%' OR column_name ILIKE '%driverid%' OR column_name ILIKE '%handlerid%' OR column_name ILIKE '%handledbyid%')
            `);
            
            for (const col of columns) {
                const records: any[] = await prisma.$queryRawUnsafe(`SELECT DISTINCT "${col.column_name}" as id FROM "${table}" WHERE "${col.column_name}" IS NOT NULL`);
                records.forEach(r => allIds.add(r.id));
            }
        } catch (e) {}
    }

    console.log('--- ALL UNIQUE IDS FOUND ---');
    Array.from(allIds).forEach(id => console.log(id));
    console.log(`Total Unique IDs: ${allIds.size}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
