import prisma from '../../config/database';
import { ReportsService } from '../reports/reports.service';

const reportsService = new ReportsService();

export class AlertsService {
  /**
   * Run the rule engine to generate alerts if conditions are met
   */
  async generateAlerts() {
    try {
      // 1. Stock Alerts
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

        const threshold = 5000;
        if (readyStock < threshold) {
          await this.createAlert({
            type: 'stock',
            message: `⚠ Low Brick Stock: Only ${readyStock.toLocaleString()} of ${bt.size} bricks remaining.`,
            severity: 'high'
          });
        }
      }

      // 2. Material Alerts
      const materials = await prisma.rawMaterial.findMany({ where: { isActive: true } });
      for (const m of materials) {
        if (m.stock < 50) {
          await this.createAlert({
            type: 'material',
            message: `⚠ Low Material: ${m.name} stock is at ${m.stock} ${m.unit}.`,
            severity: 'high'
          });
        }
      }

      // 3. Payment Alerts (Pending Balance)
      const customers = await prisma.customer.findMany({
        where: { isActive: true }
      });

      for (const client of customers) {
        const totals = await prisma.dispatch.aggregate({
          where: { customerId: client.id, status: { not: 'Cancelled' } },
          _sum: { totalAmount: true, paidAmount: true }
        });
        
        const balance = (totals._sum.totalAmount || 0) - (totals._sum.paidAmount || 0);
        if (balance > 5000) {
          await this.createAlert({
            type: 'payment',
            message: `💳 Client Payment Pending: ${client.name} has a balance of ₹${balance.toLocaleString()}.`,
            severity: 'medium',
            referenceId: client.id
          });
        }
      }

      // 4. Salary Alerts
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const lastDay = today.toISOString();
      
      const summary = await reportsService.getSummary(firstDay, lastDay);

      if (summary.salary_summary.pending > 5000) {
        await this.createAlert({
          type: 'salary',
          message: `Worker Wages: ₹${summary.salary_summary.pending.toLocaleString()} is pending for the month.`,
          severity: 'medium'
        });
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  }

  private async createAlert(data: { type: string, message: string, severity: string, referenceId?: string }) {
    // Avoid duplicates: check if an unread alert with same message exists
    const existing = await (prisma.alert as any).findFirst({
      where: { message: data.message, isRead: false }
    });

    if (!existing) {
      await (prisma.alert as any).create({ data });
    }
  }

  async getActiveAlerts() {
    await this.generateAlerts(); // Option 1: Run on load
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
