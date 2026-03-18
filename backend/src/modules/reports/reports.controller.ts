import { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const reportsService = new ReportsService();

export class ReportsController {
  getDashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
    const summary = await reportsService.getDashboardSummary();
    sendSuccess(res, summary, 'Dashboard summary retrieved successfully');
  });

  getProductionReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
      return;
    }

    const report = await reportsService.getProductionReport(
      startDate as string,
      endDate as string
    );
    sendSuccess(res, report, 'Production report retrieved successfully');
  });

  getDispatchReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
      return;
    }

    const report = await reportsService.getDispatchReport(startDate as string, endDate as string);
    sendSuccess(res, report, 'Dispatch report retrieved successfully');
  });

  getFinancialReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
      return;
    }

    const report = await reportsService.getFinancialReport(startDate as string, endDate as string);
    sendSuccess(res, report, 'Financial report retrieved successfully');
  });

  getWorkerReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
      return;
    }

    const report = await reportsService.getWorkerReport(startDate as string, endDate as string);
    sendSuccess(res, report, 'Worker report retrieved successfully');
  });

  getPersonLogs = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const result = await reportsService.getPersonLogs(
      id,
      startDate as string,
      endDate as string
    );
    sendSuccess(res, result, 'Person logs retrieved successfully');
  });

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
      return;
    }

    const report = await reportsService.getSummary(startDate as string, endDate as string);
    sendSuccess(res, report, 'BI Summary report retrieved successfully');
  });
}
