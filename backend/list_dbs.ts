import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const dbs: any[] = await prisma.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datistemplate = false');
        console.log('Databases on server:', dbs.map(d => d.datname));
    } catch (e: any) {
        console.error('Error listing databases:', e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
