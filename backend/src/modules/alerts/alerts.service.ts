import prisma from '../../config/database';
import { ReportsService } from '../reports/reports.service';
import { SystemSettingsService } from '../settings/systemSettings.service';

const reportsService = new ReportsService();
const settingsService = new SystemSettingsService();

export class AlertsService {
  async generateAlerts() {
    try {
      const startAll = Date.now();
      const settings = await settingsService.getAllSettings();
      
      const stockThreshold = parseInt(settings['stock_threshold'] || '5000');
      const materialThreshold = parseInt(settings['material_threshold'] || '50');
      const paymentThreshold = 0; // if client_balance > 0
      const salaryThreshold = 0; // if pending_salary > 0

      // 1. STOCK ALERT
      let st = Date.now();
      const brickTypes = await prisma.brickType.findMany({ where: { isActive: true } });
      for (const bt of brickTypes) {
        const produced = await prisma.production.aggregate({
          where: { brickTypeId: bt.id },
          _sum: { availableBricks: true },
        });
        const dispatched = await prisma.dispatch.aggregate({
          where: { brickTypeId: bt.id },
          _sum: { quantity: true },
        });
        const returns = await prisma.brickReturn.aggregate({
          where: { brickTypeId: bt.id },
          _sum: { returnedQuantity: true },
        });

        const readyStock = (produced._sum.availableBricks || 0) - 
                           (dispatched._sum.quantity || 0) + 
                           (returns._sum.returnedQuantity || 0);

        if (readyStock < stockThreshold) {
          await this.createAlert({
            type: 'stock',
            message: `Low Brick Stock: ${bt.size} (${readyStock.toLocaleString()} remaining)`,
            severity: 'high'
          });
        }
      }
      console.log('Stock step:', Date.now() - st);

      // 2. MATERIAL ALERT
      st = Date.now();
      const materials = await prisma.rawMaterial.findMany({ where: { isActive: true } });
      for (const m of materials) {
        if (m.stock < materialThreshold) {
          await this.createAlert({
            type: 'material',
            message: `Low Raw Material Stock: ${m.name} (${m.stock} ${m.unit})`,
            severity: 'high'
          });
        }
      }
      console.log('Material step:', Date.now() - st);

      // 3. CLIENT PAYMENT DUE
      st = Date.now();
      const customers = await prisma.customer.findMany({
        where: { isActive: true }
      });

      let pendingPaymentClients = 0;
      for (const client of customers) {
        const totals = await prisma.dispatch.aggregate({
          where: { customerId: client.id, status: { not: 'Cancelled' } },
          _sum: { totalAmount: true, paidAmount: true }
        });
        
        const balance = (totals._sum.totalAmount || 0) - (totals._sum.paidAmount || 0);
        if (balance > paymentThreshold) {
          pendingPaymentClients++;
        }
      }

      if (pendingPaymentClients > 0) {
        await this.createAlert({
          type: 'payment',
          message: `${pendingPaymentClients} Clients Pending Payment`,
          severity: 'medium'
        });
      }
      console.log('Payment step:', Date.now() - st);

      // 4. SALARY PENDING
      st = Date.now();
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const lastDay = today.toISOString();
      
      const summary = await reportsService.getSummary(firstDay, lastDay);

      if (summary.salary_summary.pending > salaryThreshold) {
        await this.createAlert({
          type: 'salary',
          message: "Salary Pending for Workers",
          severity: 'medium'
        });
      }
      console.log('Salary step:', Date.now() - st);

      // 5. DISPATCH PENDING
      st = Date.now();
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const readyOrders = await prisma.clientOrder.findMany({
        where: {
          status: 'READY',
          updatedAt: { lte: oneDayAgo }
        },
        include: { client: true }
      });

      for (const order of readyOrders) {
        await this.createAlert({
          type: 'dispatch',
          message: `Pending Dispatch: ${order.client.name} - ${order.quantity} bricks (Ready since ${order.updatedAt.toLocaleDateString()})`,
          severity: 'medium',
          referenceId: order.id
        });
      }
      console.log('Dispatch step:', Date.now() - st);

      console.log('Total generateAlerts:', Date.now() - startAll);
    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  }

  private async createAlert(data: { type: string, message: string, severity: string, referenceId?: string }) {
    const existing = await (prisma.alert as any).findFirst({
      where: { message: data.message, isRead: false }
    });

    if (!existing) {
      await (prisma.alert as any).create({ data });
    }
  }

  async getActiveAlerts() {
    // Run in background without blocking the API response to avoid 15s Axios timeouts!
    this.generateAlerts().catch(console.error); 
    
    return await (prisma.alert as any).findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  async markAsRead(id: string) {
    return await (prisma.alert as any).update({
      where: { id },
      data: { isRead: true }
    });
  }

  async markAllAsRead() {
    return await (prisma.alert as any).updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
  }
}
