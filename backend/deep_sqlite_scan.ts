import { PrismaClient } from './prisma/recovery-client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DEEP SQLITE INSPECTION ---');
    try {
        const tables: any[] = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('All tables:', tables.map(t => t.name));
        
        for (const t of tables.map(t => t.name)) {
            try {
                const res: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${t}"`);
                console.log(`Table "${t}": ${res[0].count} rows`);
                
                if (res[0].count > 0 && !t.startsWith('sqlite_') && !t.startsWith('_')) {
                    const samples: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${t}" LIMIT 1`);
                    console.log(`   Sample from ${t}:`, JSON.stringify(samples[0]).substring(0, 100));
                }
            } catch (e: any) {
                console.log(`   Error counting ${t}: ${e.message}`);
            }
        }
    } catch (e: any) {
        console.error('Failed to list tables:', e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
