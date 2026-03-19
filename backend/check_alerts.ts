import prisma from './src/config/database';
import fs from 'fs';

async function checkDispatches() {
  const alerts = await (prisma.alert as any).findMany({
    orderBy: { createdAt: 'desc' }
  });
  let out = 'Latest Alerts:\n';
  alerts.forEach((a: any) => {
    out += `- ID: ${a.id}, Msg: ${a.message}, isRead: ${a.isRead}, Created: ${a.createdAt}\n`;
  });

  const bts = await prisma.brickType.findMany();
  for (const bt of bts) {
    const produced = await prisma.production.aggregate({
      where: { brickTypeId: bt.id },
      _sum: { availableBricks: true },
    });
    const dispatched = await prisma.dispatch.aggregate({
      where: { brickTypeId: bt.id },
      _sum: { quantity: true },
    });
    const returns = await (prisma as any).brickReturn.aggregate({
      where: { brickTypeId: bt.id },
      _sum: { returnedQuantity: true },
    });

    const readyStock = (produced._sum.availableBricks || 0) - 
                        (dispatched._sum.quantity || 0) + 
                        (returns._sum.returnedQuantity || 0);
    out += `\nStock for ${bt.size}: ${readyStock}`;
  }

  fs.writeFileSync('out_alerts.txt', out);
  console.log('Saved to out_alerts.txt');
  await prisma.$disconnect();
}
checkDispatches();
