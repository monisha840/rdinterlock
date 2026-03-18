import { Request, Response } from 'express';
import { RemindersService } from './reminders.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const remindersService = new RemindersService();

export class RemindersController {
  createReminder = asyncHandler(async (req: Request, res: Response) => {
    const reminder = await remindersService.createReminder(req.body);
    sendSuccess(res, reminder, 'Reminder created successfully');
  });

  getReminders = asyncHandler(async (_req: Request, res: Response) => {
    const reminders = await remindersService.getReminders();
    sendSuccess(res, reminders, 'Reminders retrieved successfully');
  });

  getTodaysReminders = asyncHandler(async (_req: Request, res: Response) => {
    const reminders = await remindersService.getTodaysReminders();
    sendSuccess(res, reminders, 'Today\'s reminders retrieved successfully');
  });

  updateReminder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const reminder = await remindersService.updateReminder(id, req.body);
    sendSuccess(res, reminder, 'Reminder updated successfully');
  });

  deleteReminder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await remindersService.deleteReminder(id);
    sendSuccess(res, null, 'Reminder deleted successfully');
  });
}
