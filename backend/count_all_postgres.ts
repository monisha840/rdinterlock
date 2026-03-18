import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const counts: any = {};
    const tables = [
        'user', 'machine', 'brickType', 'worker', 'production', 
        'customer', 'clientOrder', 'clientPayment', 'dispatch', 
        'expense', 'cashEntry', 'rawMaterial', 'attendance', 
        'workerAdvance', 'dailyWage'
    ];
    for (const t of tables) {
        try {
            counts[t] = await (prisma as any)[t].count();
        } catch (e) {}
    }
    console.log(JSON.stringify(counts, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
