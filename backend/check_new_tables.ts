import prisma from './src/config/database';

async function main() {
  try {
    const configs = await prisma.materialConfig.findMany();
    console.log('materialConfig: OK, rows:', configs.length);
  } catch (e: any) {
    console.log('materialConfig: FAIL -', e.message);
  }
  
  try {
    const logs = await prisma.materialConsumptionLog.findMany();
    console.log('materialConsumptionLog: OK, rows:', logs.length);
  } catch (e: any) {
    console.log('materialConsumptionLog: FAIL -', e.message);
  }

  try {
    const returns = await prisma.brickReturn.findMany();
    console.log('brickReturn: OK, rows:', returns.length);
  } catch (e: any) {
    console.log('brickReturn: FAIL -', e.message);
  }

  await prisma.$disconnect();
}

main();
