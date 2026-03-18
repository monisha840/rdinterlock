import { Request, Response } from 'express';
import { ReturnsService } from './returns.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const service = new ReturnsService();

export class ReturnsController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const { dispatchId, returnedQuantity, reason, date } = req.body;

    if (!dispatchId || !returnedQuantity || !date) {
      res.status(400).json({
        success: false,
        message: 'dispatchId, returnedQuantity, and date are required',
      });
      return;
    }

    const result = await service.createReturn({
      dispatchId,
      returnedQuantity: Number(returnedQuantity),
      reason,
      date,
    });
    sendSuccess(res, result, 'Brick return recorded successfully');
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, clientId, brickTypeId, dispatchId } = req.query;
    const returns = await service.getReturns({
      startDate: startDate as string,
      endDate: endDate as string,
      clientId: clientId as string,
      brickTypeId: brickTypeId as string,
      dispatchId: dispatchId as string,
    });
    sendSuccess(res, returns, 'Returns retrieved');
  });

  getByDispatch = asyncHandler(async (req: Request, res: Response) => {
    const result = await service.getReturnsByDispatch(req.params.dispatchId);
    sendSuccess(res, result, 'Returns for dispatch retrieved');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await service.deleteReturn(req.params.id);
    sendSuccess(res, result, 'Return deleted');
  });
}
