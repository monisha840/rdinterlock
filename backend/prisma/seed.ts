import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
    // Clear existing data
    await prisma.user.deleteMany();

    // Create new admin user
    const hashedPassword = await bcrypt.hash('rdadmin', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'adminrd@interlock.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'adminrd@interlock.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    // Create Machines
    const machines = ['Machine A', 'Machine B'];
    for (const name of machines) {
        await prisma.machine.upsert({
            where: { name },
            update: { isActive: true },
            create: { name, isActive: true },
        });
    }

    // Create Brick Types
    const brickTypes = ['6 inch', '8 inch'];
    for (const size of brickTypes) {
        await prisma.brickType.upsert({
            where: { size },
            update: { isActive: true },
            create: { size, isActive: true },
        });
    }

    // Create some default workers if needed
    const workers = [
        { name: 'Raju', role: 'OPERATOR', paymentType: 'PER_BRICK', rate: 1.5 },
        { name: 'Suresh', role: 'HELPER', paymentType: 'DAILY', rate: 500 },
    ];

    for (const w of workers) {
        await prisma.worker.create({
            data: { ...w, isActive: true },
        });
    }

    console.log('Seeding finished.');
    console.log('Reference data (Machines, BrickTypes, Workers) created.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
