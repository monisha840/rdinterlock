import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const orphanedIds = new Set<string>();

    // 1. Find all workerIds in related tables
    const tables = [
        'attendance', 'daily_wages', 'worker_advances', 'production_workers',
        'weekly_settlements', 'monthly_settlements', 'expenses', 'cash_entries',
        'dispatches', 'client_orders', 'transport_entries'
    ];

    console.log('--- SCANNING FOR ORPHANED IDS ---');
    for (const table of tables) {
        try {
            // Check for workerId
            const workerRecords: any[] = await prisma.$queryRawUnsafe(`SELECT DISTINCT "workerId" FROM "${table}" WHERE "workerId" IS NOT NULL`);
            workerRecords.forEach(r => orphanedIds.add(r.workerId));
            
            // Check for driverId
            try {
                const driverRecords: any[] = await prisma.$queryRawUnsafe(`SELECT DISTINCT "driverId" FROM "${table}" WHERE "driverId" IS NOT NULL`);
                driverRecords.forEach(r => orphanedIds.add(r.driverId));
            } catch (e) {}

            // Check for handledById
            try {
                const handlerRecords: any[] = await prisma.$queryRawUnsafe(`SELECT DISTINCT "handledById" FROM "${table}" WHERE "handledById" IS NOT NULL`);
                handlerRecords.forEach(r => orphanedIds.add(r.handledById));
            } catch (e) {}
        } catch (e) {
            // console.log(`Skipping table ${table}: column workerId likely missing`);
        }
    }

    console.log(`Found ${orphanedIds.size} unique orphaned worker IDs.`);

    // 2. Parse cash_result.txt for Name mappings
    const idToName: Record<string, string> = {};
    const cashResultPath = path.join(__dirname, 'tmp', 'cash_result.txt');
    
    if (fs.existsSync(cashResultPath)) {
        console.log('--- PARSING RECOVERY FILE ---');
        // Try reading as utf16le as identified in previous steps
        let content = '';
        try {
            content = fs.readFileSync(cashResultPath, 'utf16le');
        } catch (e) {
            content = fs.readFileSync(cashResultPath, 'utf8');
        }

        // Pattern: --- NAME CASH ENTRIES --- followed by JSON with IDs
        const segments = content.split(/--- (.*) CASH ENTRIES ---/);
        for (let i = 1; i < segments.length; i += 2) {
            const name = segments[i].trim();
            const segmentText = segments[i + 1];
            const uuidMatches = segmentText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
            if (uuidMatches) {
                uuidMatches.forEach(id => {
                    if (orphanedIds.has(id)) {
                        idToName[id] = name;
                    }
                });
            }
        }
    } else {
        console.log('Warning: cash_result.txt not found. Names will be generic.');
    }

    // 2b. Also check check_output.txt if it exists
    const checkOutputPath = path.join(__dirname, 'check_output.txt');
    if (fs.existsSync(checkOutputPath)) {
        const content = fs.readFileSync(checkOutputPath, 'utf8');
        const segments = content.split(/--- (.*) WORKERS ---/);
        for (let i = 1; i < segments.length; i += 2) {
            const name = segments[i].trim();
            const segmentText = segments[i+1];
            const uuidMatches = segmentText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
            if (uuidMatches) {
                uuidMatches.forEach(id => {
                    if (orphanedIds.has(id) && !idToName[id]) {
                        idToName[id] = name;
                    }
                });
            }
        }
    }

    // 3. Restore Workers
    console.log('--- RESTORING WORKERS ---');
    let restoredCount = 0;
    for (const id of orphanedIds) {
        const existing = await prisma.worker.findUnique({ where: { id } });
        if (existing) {
            console.log(`Skipping ${id} (already exists: ${existing.name})`);
            continue;
        }

        const name = idToName[id] || `Recovered_${id.substring(0, 4)}`;
        
        // Intelligent role guessing
        let employeeType = "Worker";
        let role = "PRODUCTION";
        let paymentType = "WEEKLY";

        const upperName = name.toUpperCase();
        if (upperName.includes("MANAGER") || upperName.includes("ADMIN") || upperName.includes("OM")) {
            employeeType = "Staff";
            role = "MANAGER";
            paymentType = "MONTHLY";
        } else if (upperName.includes("DRIVER")) {
            employeeType = "Staff";
            role = "DRIVER";
            paymentType = "MONTHLY";
        } else if (upperName.includes("TELECALLER")) {
            employeeType = "Staff";
            role = "TELECALLER";
            paymentType = "MONTHLY";
        }

        try {
            await prisma.worker.create({
                data: {
                    id,
                    name,
                    role,
                    employeeType,
                    paymentType,
                    isActive: true,
                    rate: 0,
                    monthlySalary: 0,
                    weeklyWage: 0,
                    perBrickRate: 0
                }
            });
            console.log(`Restored: ${name} (${id}) as ${employeeType}`);
            restoredCount++;
        } catch (e: any) {
            console.error(`Failed to restore ${id}: ${e.message}`);
        }
    }

    console.log(`--- RESTORATION COMPLETE ---`);
    console.log(`Restored ${restoredCount} records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
