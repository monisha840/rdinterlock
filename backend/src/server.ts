import app from './app';
import { config } from './config';
import prisma from './config/database';
import { AlertsService } from './modules/alerts/alerts.service';

const alertsService = new AlertsService();

const PORT = config.port;

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Background Alert Job (Run every 10 minutes)
function startAlertJob() {
  console.log('⏰ Starting background alert engine...');
  // Initial run
  alertsService.generateAlerts().catch(err => console.error('Error in initial alert job:', err));
  
  // Schedule
  setInterval(async () => {
    try {
      console.log('🔍 Running scheduled alert checks...');
      await alertsService.generateAlerts();
    } catch (error) {
      console.error('Error in scheduled alert job:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes
}

// Start server
async function startServer() {
  try {
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 RD Interlock Factory Operations API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api/v1`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/v1/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      // Start background jobs
      startAlertJob();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();
