import { AlertsService } from './src/modules/alerts/alerts.service';
import prisma from './src/config/database';

async function testAlerts() {
  console.log('Testing alerts generation...');
  const alertsService = new AlertsService();
  try {
    await alertsService.generateAlerts();
    console.log('Generate alerts completed without throwing top-level error.');
    
    // Check if any alerts were created
    const activeAlerts = await (prisma as any).alert.findMany({ where: { isRead: false } });
    console.log('Found active alerts:', activeAlerts.length);
    console.log(activeAlerts);
  } catch (err) {
    console.error('Caught error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testAlerts();
