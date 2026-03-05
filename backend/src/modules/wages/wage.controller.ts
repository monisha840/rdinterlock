import { Request, Response, NextFunction } from 'express';
import { WageService } from './wage.service';
import { AttendanceService } from './attendance.service';
import { AdvanceService } from './advance.service';
import {
  markAttendanceSchema,
  getAttendanceSchema,
  giveAdvanceSchema,
  calculateWagesSchema,
  getWagesSchema,
  payWagesSchema,
} from './wage.validation';

const wageService = new WageService();
const attendanceService = new AttendanceService();
const advanceService = new AdvanceService();

export class WageController {
  // ============== ATTENDANCE ==============

  async markAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = markAttendanceSchema.parse(req.body);
      const date = new Date(validated.date);

      const attendance = await attendanceService.markAttendance(
        validated.workerId,
        date,
        validated.present
      );

      res.json({
        success: true,
        data: attendance,
        message: 'Attendance marked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = getAttendanceSchema.parse(req.query);

      const filters: any = {};
      if (validated.date) filters.date = new Date(validated.date);
      if (validated.workerId) filters.workerId = validated.workerId;
      if (validated.startDate) filters.startDate = new Date(validated.startDate);
      if (validated.endDate) filters.endDate = new Date(validated.endDate);

      const attendance = await attendanceService.getAttendance(filters);

      res.json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkMarkAttendance(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { records } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Records array is required',
        });
      }

      const validatedRecords = records.map((r) => ({
        workerId: r.workerId,
        date: new Date(r.date),
        present: r.present ?? true,
      }));

      const result = await attendanceService.bulkMarkAttendance(
        validatedRecords
      );

      res.json({
        success: true,
        data: result,
        message: `${result.length} attendance records marked successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============== WAGES ==============

  async calculateWages(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = calculateWagesSchema.parse(req.query);
      const date = new Date(validated.date);

      // Calculate wages
      const calculations = await wageService.calculateDailyWages(date);

      // Save to database
      await wageService.saveCalculatedWages(date, calculations);

      // Calculate totals
      const totalWageAmount = calculations.reduce(
        (sum, c) => sum + c.wageAmount,
        0
      );
      const totalAdvanceUsed = calculations.reduce(
        (sum, c) => sum + c.advanceUsed,
        0
      );
      const totalNetPayable = calculations.reduce(
        (sum, c) => sum + c.netPayable,
        0
      );

      res.json({
        success: true,
        data: {
          date: validated.date,
          workers: calculations,
          summary: {
            totalWageAmount,
            totalAdvanceUsed,
            totalNetPayable,
            workerCount: calculations.length,
          },
        },
        message: 'Wages calculated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getWages(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = getWagesSchema.parse(req.query);

      const filters: any = {};
      if (validated.date) filters.date = new Date(validated.date);
      if (validated.startDate) filters.startDate = new Date(validated.startDate);
      if (validated.endDate) filters.endDate = new Date(validated.endDate);
      if (validated.workerId) filters.workerId = validated.workerId;
      if (validated.isPaid !== undefined)
        filters.isPaid = validated.isPaid === 'true';

      const wages = await wageService.getWages(filters);

      // Calculate summary
      const summary = {
        totalWageAmount: wages.reduce((sum: number, w: any) => sum + w.wageAmount, 0),
        totalAdvanceUsed: wages.reduce((sum: number, w: any) => sum + w.advanceUsed, 0),
        totalNetPayable: wages.reduce((sum: number, w: any) => sum + w.netPayable, 0),
        paidCount: wages.filter((w: any) => w.isPaid).length,
        pendingCount: wages.filter((w: any) => !w.isPaid).length,
      };

      res.json({
        success: true,
        data: wages,
        meta: {
          total: wages.length,
          summary,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async payWages(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = payWagesSchema.parse(req.body);

      const paymentDate = validated.paymentDate
        ? new Date(validated.paymentDate)
        : undefined;

      const result = await wageService.payWages(
        validated.wageIds,
        paymentDate
      );

      res.json({
        success: true,
        data: result,
        message: `${result.updatedWages.length} wage(s) paid successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteWage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await wageService.deleteWage(id);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkerWageReport(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }
      const report = await wageService.getWorkerWageReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async getWageSummary(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const summary = await wageService.getWageSummary(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============== ADVANCES ==============

  async giveAdvance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: workerId } = req.params;
      const validated = giveAdvanceSchema.parse(req.body);

      const result = await advanceService.giveAdvance(
        workerId,
        validated.amount,
        validated.note
      );

      res.json({
        success: true,
        data: result,
        message: `Advance of ₹${validated.amount} given successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdvanceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: workerId } = req.params;
      const { startDate, endDate, type } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (type) filters.type = type;

      const history = await advanceService.getAdvanceHistory(
        workerId,
        filters
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdvanceBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: workerId } = req.params;

      const balance = await advanceService.getCurrentBalance(workerId);

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkersWithPendingAdvances(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const workers = await advanceService.getWorkersWithPendingAdvances();

      res.json({
        success: true,
        data: workers,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkGiveAdvance(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { records } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Records array is required',
        });
      }

      const validatedRecords = records.map((r) => ({
        workerId: r.workerId,
        amount: parseFloat(r.amount),
        note: r.note || `Advance given on staff attendance page`,
      }));

      const result = await advanceService.bulkGiveAdvance(validatedRecords);

      res.json({
        success: true,
        data: result,
        message: `${result.length} advances recorded successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}
