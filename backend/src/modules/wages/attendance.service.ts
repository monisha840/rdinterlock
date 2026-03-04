import prisma from '../../config/database';



export class AttendanceService {
  /**
   * Mark attendance for a worker on a specific date
   */
  async markAttendance(workerId: string, date: Date, present: boolean) {
    // Check if worker exists
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      throw new Error('Worker not found');
    }

    if (!worker.isActive) {
      throw new Error('Worker is not active');
    }

    // Upsert attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        workerId_date: {
          workerId,
          date,
        },
      },
      update: {
        present,
      },
      create: {
        workerId,
        date,
        present,
      },
    });

    return attendance;
  }

  /**
   * Get attendance records with filters
   */
  async getAttendance(filters: {
    date?: Date;
    workerId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters.workerId) {
      where.workerId = filters.workerId;
    }

    if (filters.date) {
      where.date = filters.date;
    } else if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            role: true,
            paymentType: true,
            rate: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { worker: { name: 'asc' } }],
    });

    return attendance;
  }

  /**
   * Get attendance for a specific date grouped by worker
   */
  async getAttendanceByDate(date: Date) {
    const attendance = await prisma.attendance.findMany({
      where: { date },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            role: true,
            paymentType: true,
            isActive: true,
          },
        },
      },
    });

    return attendance;
  }

  /**
   * Mark multiple workers as present/absent
   */
  async bulkMarkAttendance(
    records: Array<{ workerId: string; date: Date; present: boolean }>
  ) {
    const results = await Promise.all(
      records.map((record) =>
        this.markAttendance(record.workerId, record.date, record.present)
      )
    );

    return results;
  }
}
