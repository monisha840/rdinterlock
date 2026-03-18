import prisma from './src/config/database';
import { ReportsService } from './src/modules/reports/reports.service';

async function verify() {
  const reportsService = new ReportsService();
  
  // Find Kamal
  const kamal = await prisma.worker.findFirst({
    where: { name: { contains: 'Kamal', mode: 'insensitive' } }
  });

  if (!kamal) {
    console.log('Kamal not found');
    return;
  }

  console.log(`Verifying logs for: ${kamal.name} (ID: ${kamal.id})`);

  // Get logs for the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const logs = await reportsService.getPersonLogs(
    kamal.id, 
    startOfMonth.toISOString().split('T')[0], 
    endOfMonth.toISOString().split('T')[0]
  );

  console.log('Summary:', JSON.stringify(logs.summary, null, 2));
  
  const productionLogs = logs.logs.filter((l: any) => l.type === 'production');
  console.log(`Found ${productionLogs.length} production logs.`);
  
  if (productionLogs.length > 0) {
    console.log('First production log:', JSON.stringify(productionLogs[0], null, 2));
  }

  // Also check if totalEarned is > 0
  if (logs.summary.totalEarned > 0) {
    console.log('SUCCESS: Total Earned is > 0');
  } else {
    console.log('WARNING: Total Earned is 0');
  }
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
