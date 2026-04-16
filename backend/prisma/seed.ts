import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
    // Clear existing data
    await prisma.user.deleteMany();

    // Create new admin user
    const hashedPassword = await bcrypt.hash('rdadmin', 10);

    await prisma.user.upsert({
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
    const machines = ['Machine A', 'Machine B', 'Machine C'];
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

    // Create Default Raw Materials
    const materials = [
        { name: 'Cement', unit: 'BAG' },
        { name: 'Fly Ash', unit: 'KG' },
        { name: 'Add Mixture', unit: 'LTR' },
        { name: 'Crusher Powder', unit: 'TON' }
    ];

    // Deactivate old materials
    await prisma.rawMaterial.updateMany({
        where: { name: { in: ['Red Oxide', 'Yellow Oxide'] } },
        data: { isActive: false }
    });

    for (const m of materials) {
        await prisma.rawMaterial.upsert({
            where: { name: m.name },
            update: { isActive: true },
            create: { ...m, isActive: true },
        });
    }

    // Create some default workers if needed
    const workers = [
        { name: 'Raju', role: 'OPERATOR', paymentType: 'PER_BRICK', rate: 1.5 },
        { name: 'Manager', role: 'MANAGER', paymentType: 'MONTHLY', rate: 1000 },
        { name: 'Driver 1', role: 'DRIVER', paymentType: 'MONTHLY', rate: 800 },
        { name: 'Telecaller', role: 'TELECALLER', paymentType: 'MONTHLY', rate: 500 },
    ];

    for (const w of workers) {
        const existing = await prisma.worker.findFirst({ where: { name: w.name } });
        if (!existing) {
            await prisma.worker.create({
                data: { ...w, isActive: true },
            });
        }
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
