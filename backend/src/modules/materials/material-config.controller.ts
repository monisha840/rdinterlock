import { Request, Response } from 'express';
import { MaterialConfigService } from './material-config.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const service = new MaterialConfigService();

export class MaterialConfigController {
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const configs = await service.getAllMaterialConfigs();
    sendSuccess(res, configs, 'Material configs retrieved');
  });

  getByBrickType = asyncHandler(async (req: Request, res: Response) => {
    const config = await service.getMaterialConfig(req.params.brickTypeId);
    sendSuccess(res, config, 'Material config retrieved');
  });

  upsert = asyncHandler(async (req: Request, res: Response) => {
    const { brickTypeId, cementPer1000, flyAshPer1000, powderPer1000 } = req.body;

    if (!brickTypeId) {
      res.status(400).json({ success: false, message: 'brickTypeId is required' });
      return;
    }

    const config = await service.upsertMaterialConfig({
      brickTypeId,
      cementPer1000: Number(cementPer1000) || 0,
      flyAshPer1000: Number(flyAshPer1000) || 0,
      powderPer1000: Number(powderPer1000) || 0,
    });
    sendSuccess(res, config, 'Material config saved');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await service.deleteMaterialConfig(req.params.brickTypeId);
    sendSuccess(res, result, 'Material config deleted');
  });
}
