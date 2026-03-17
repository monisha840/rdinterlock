import { PrismaClient as RecoveryClient } from './prisma/recovery-client';

async function main() {
  const recovery = new RecoveryClient();
  try {
    const workers: any[] = await recovery.$queryRaw`SELECT * FROM workers`;
    console.log(`Raw query found ${workers.length} workers.`);
    if (workers.length > 0) {
      console.log('Sample worker:', JSON.stringify(workers[0], null, 2));
    }
  } catch (error) {
    console.error('Error during raw query:', error);
  } finally {
    await recovery.$disconnect();
  }
}

main();
