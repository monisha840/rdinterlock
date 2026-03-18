import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const workers = await prisma.worker.findMany();
    console.log(JSON.stringify(workers.map(w => ({
        id: w.id, 
        name: w.name, 
        employeeType: w.employeeType, 
        role: w.role
    })), null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
