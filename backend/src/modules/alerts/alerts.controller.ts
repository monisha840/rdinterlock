import { Request, Response } from 'express';
import { AlertsService } from './alerts.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const alertsService = new AlertsService();

export class AlertsController {
  getAlerts = asyncHandler(async (_req: Request, res: Response) => {
    const alerts = await alertsService.getActiveAlerts();
    sendSuccess(res, alerts, 'Alerts retrieved successfully');
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await alertsService.markAsRead(id);
    sendSuccess(res, null, 'Alert marked as read');
  });

  markAllRead = asyncHandler(async (_req: Request, res: Response) => {
    await alertsService.markAllAsRead();
    sendSuccess(res, null, 'All alerts marked as read');
  });
}
