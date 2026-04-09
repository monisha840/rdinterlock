import { Request, Response } from 'express';
import { ProductionService } from './production.service';
import { createProductionSchema, updateProductionSchema, getProductionQuerySchema } from './production.validation';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const productionService = new ProductionService();

export class ProductionController {
  createProduction = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createProductionSchema.parse(req.body);
    const production = await productionService.createProduction(validatedData);
    sendSuccess(res, production, 'Production created successfully', 201);
  });

  getProductions = asyncHandler(async (req: Request, res: Response) => {
    const validatedQuery = getProductionQuerySchema.parse(req.query);
    const result = await productionService.getProductions(validatedQuery);
    sendSuccess(res, result.productions, 'Productions retrieved successfully', 200, result.pagination);
  });

  getProductionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const production = await productionService.getProductionById(id);
    sendSuccess(res, production, 'Production retrieved successfully');
  });

  getProductionHistory = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, machineId, brickTypeId } = req.query;
    const result = await productionService.getProductionHistory(
      startDate as string,
      endDate as string,
      machineId as string,
      brickTypeId as string
    );
    sendSuccess(res, result, 'Production history retrieved successfully');
  });

  updateProduction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateProductionSchema.parse(req.body);
    const production = await productionService.updateProduction(id, validatedData);
    sendSuccess(res, production, 'Production updated successfully');
  });

  deleteProduction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await productionService.deleteProduction(id);
    sendSuccess(res, result, 'Production deleted successfully');
  });
}
