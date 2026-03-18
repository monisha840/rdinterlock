import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const entries = await prisma.cashEntry.findMany({
        select: { description: true, vendorName: true },
    });
    const uniqueDescs = new Set(entries.map(e => e.description));
    console.log('Unique Descriptions:', Array.from(uniqueDescs));
    
    const uniqueVendors = new Set(entries.map(e => e.vendorName));
    console.log('Unique Vendors:', Array.from(uniqueVendors));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
