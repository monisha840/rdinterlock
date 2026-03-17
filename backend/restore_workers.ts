import { PrismaClient as RecoveryClient } from './prisma/recovery-client';
import { PrismaClient as MainClient } from '@prisma/client';

async function main() {
  const recovery = new RecoveryClient();
  const main = new MainClient();

  try {
    const backupWorkers = await recovery.workers.findMany();
    console.log(`Found ${backupWorkers.length} workers in backup SQLite.`);

    for (const w of backupWorkers) {
      console.log(`Restoring worker: ${w.name} (${w.id})`);
      await main.worker.upsert({
        where: { id: w.id },
        update: {
          name: w.name,
          role: w.role,
          paymentType: w.paymentType as any,
          rate: w.rate,
          isActive: w.isActive,
          advanceBalance: w.advanceBalance,
        },
        create: {
          id: w.id,
          name: w.name,
          role: w.role,
          paymentType: w.paymentType as any,
          rate: w.rate,
          isActive: w.isActive,
          advanceBalance: w.advanceBalance,
        }
      });
    }
    console.log('Successfully restored workers!');
  } catch (error) {
    console.error('Error during restoration:', error);
  } finally {
    await recovery.$disconnect();
    await main.$disconnect();
  }
}

main();
