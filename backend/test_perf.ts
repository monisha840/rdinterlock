import { AlertsService } from './src/modules/alerts/alerts.service';

async function test() {
  const svc = new AlertsService();
  console.log('Starting getActiveAlerts...');
  const start = Date.now();
  await svc.getActiveAlerts();
  const end = Date.now();
  console.log(`Finished in ${end - start}ms`);
  process.exit(0);
}
test();
