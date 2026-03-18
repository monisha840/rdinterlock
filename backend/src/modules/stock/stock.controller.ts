import { Request, Response } from 'express';
import { StockService } from './stock.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const stockService = new StockService();

export class StockController {
  getCurrentStock = asyncHandler(async (req: Request, res: Response) => {
    const { brickTypeId } = req.query;
    const stock = await stockService.getCurrentStock(brickTypeId as string);
    sendSuccess(res, stock, 'Current stock retrieved successfully');
  });

  getStockHistory = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, brickTypeId } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
      return;
    }

    const history = await stockService.getStockHistory(
      startDate as string,
      endDate as string,
      brickTypeId as string
    );
    sendSuccess(res, history, 'Stock history retrieved successfully');
  });

  getReadyStock = asyncHandler(async (_req: Request, res: Response) => {
    const stock = await stockService.getReadyStock();
    sendSuccess(res, stock, 'Ready stock retrieved successfully');
  });

  getInventoryAlerts = asyncHandler(async (_req: Request, res: Response) => {
    const alerts = await stockService.getInventoryAlerts();
    sendSuccess(res, alerts, 'Inventory alerts retrieved successfully');
  });
}
