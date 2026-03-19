import prisma from './src/config/database';

async function testQuery() {
  const allAlerts = await (prisma.alert as any).findMany();
  console.log('Total alerts:', allAlerts.length);
  const unreadAlertsList = allAlerts.filter((a: any) => a.isRead === false);
  console.log('Total alerts where isRead is exactly false in JS:', unreadAlertsList.length);

  const prismaUnread = await (prisma.alert as any).findMany({ where: { isRead: false } });
  console.log('Total alerts from Prisma where isRead: false :', prismaUnread.length);

  await prisma.$disconnect();
}
testQuery();
