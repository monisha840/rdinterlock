import prisma from '../../config/database';



export class AttendanceService {
  /**
   * Mark attendance for a worker on a specific date
   */
  async markAttendance(workerId: string, date: Date, present: boolean, notes?: string) {
    // 1. Log transition for debugging
    console.log(`[Attendance] Marking ${workerId} as ${present ? 'PRESENT' : 'ABSENT'} on ${date.toISOString().split('T')[0]}`);

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
        notes: notes || null,
      },
      create: {
        workerId,
        date,
        present,
        notes: notes || null,
      },
    });

    return attendance;
  }

  /**
   * Get attendance records with filters
   */
  async getAttendance(filters: {
    workerId?: string;
    startDate?: Date;
    endDate?: Date;
    date?: Date;
  }) {
    const { workerId, startDate, endDate, date } = filters;

    const where: any = {};
    if (workerId) where.workerId = workerId;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            role: true,
            employeeType: true
          }
        }
      },
      orderBy: {
        date: 'desc',
      },
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
