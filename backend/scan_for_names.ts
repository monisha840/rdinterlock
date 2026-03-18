import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SCANNING FOR NAMES IN CASH ENTRIES & EXPENSES ---');
    
    const cashVendors = await prisma.cashEntry.findMany({
        select: { vendorName: true },
        distinct: ['vendorName']
    });
    console.log('CashEntry vendorNames:', cashVendors.map(v => v.vendorName).filter(Boolean));

    const cashDescriptions = await prisma.cashEntry.findMany({
        select: { description: true },
    });
    
    // Extract names from descriptions like "Labor: VIJAY"
    const namesFromDesc = new Set<string>();
    cashDescriptions.forEach(d => {
        const matches = d.description.match(/Labor:?\s*([A-Z\s]+)/i);
        if (matches) namesFromDesc.add(matches[1].trim());
    });
    console.log('Potential names from descriptions:', Array.from(namesFromDesc));

    const distinctExpenses = await prisma.expense.findMany({
        select: { category: true },
        distinct: ['category']
    });
    console.log('Expense categories:', distinctExpenses.map(e => e.category));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
