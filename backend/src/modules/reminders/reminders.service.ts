import prisma from '../../config/database';

export class RemindersService {
  async createReminder(data: { title: string, description?: string, dueDate: string }) {
    return await (prisma.reminder as any).create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: new Date(data.dueDate),
        status: 'PENDING'
      }
    });
  }

  async getReminders() {
    return await (prisma.reminder as any).findMany({
      orderBy: [
        { status: 'asc' }, // Pending first
        { dueDate: 'asc' }
      ]
    });
  }

  async getTodaysReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await (prisma.reminder as any).findMany({
      where: {
        dueDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async updateReminder(id: string, data: any) {
    const updateData = { ...data };
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
    
    return await (prisma.reminder as any).update({
      where: { id },
      data: updateData
    });
  }

  async deleteReminder(id: string) {
    return await (prisma.reminder as any).delete({
      where: { id }
    });
  }
}
