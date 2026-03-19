import prisma from './src/config/database';
import fs from 'fs';

async function checkDispatches() {
  const dispatches = await prisma.dispatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { brickType: true, customer: true }
  });
  let out = 'Latest dispatches:\n';
  dispatches.forEach(d => {
    out += `- ID: ${d.id}, Qty: ${d.quantity}, Client: ${d.customer?.name}, Type: ${d.brickType?.size}\n`;
  });

  const aggregate = await prisma.dispatch.aggregate({
    _sum: { quantity: true }
  });
  out += '\nTotal Dispatched Qty: ' + aggregate._sum.quantity + '\n';

  const materials = await prisma.rawMaterial.findMany();
  out += '\nMaterials:\n';
  materials.forEach(m => out += `- ${m.name}: ${m.stock} ${m.unit}\n`);

  fs.writeFileSync('out.txt', out);
  console.log('Saved to out.txt');
  await prisma.$disconnect();
}
checkDispatches();

