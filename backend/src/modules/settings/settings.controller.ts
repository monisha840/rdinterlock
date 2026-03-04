import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import {
  createMachineSchema,
  updateMachineSchema,
  createBrickTypeSchema,
  updateBrickTypeSchema,
} from './settings.validation';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const settingsService = new SettingsService();

export class SettingsController {
  // Machine management
  createMachine = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createMachineSchema.parse(req.body);
    const machine = await settingsService.createMachine(validatedData);
    sendSuccess(res, machine, 'Machine created successfully', 201);
  });

  getAllMachines = asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.activeOnly === 'true';
    const machines = await settingsService.getAllMachines(activeOnly);
    sendSuccess(res, machines, 'Machines retrieved successfully');
  });

  getMachineById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const machine = await settingsService.getMachineById(id);
    sendSuccess(res, machine, 'Machine retrieved successfully');
  });

  updateMachine = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateMachineSchema.parse(req.body);
    const machine = await settingsService.updateMachine(id, validatedData);
    sendSuccess(res, machine, 'Machine updated successfully');
  });

  deleteMachine = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await settingsService.deleteMachine(id);
    sendSuccess(res, result, 'Machine deleted successfully');
  });

  // Brick Type management
  createBrickType = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createBrickTypeSchema.parse(req.body);
    const brickType = await settingsService.createBrickType(validatedData);
    sendSuccess(res, brickType, 'Brick type created successfully', 201);
  });

  getAllBrickTypes = asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.activeOnly === 'true';
    const brickTypes = await settingsService.getAllBrickTypes(activeOnly);
    sendSuccess(res, brickTypes, 'Brick types retrieved successfully');
  });

  getBrickTypeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const brickType = await settingsService.getBrickTypeById(id);
    sendSuccess(res, brickType, 'Brick type retrieved successfully');
  });

  updateBrickType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateBrickTypeSchema.parse(req.body);
    const brickType = await settingsService.updateBrickType(id, validatedData);
    sendSuccess(res, brickType, 'Brick type updated successfully');
  });

  deleteBrickType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await settingsService.deleteBrickType(id);
    sendSuccess(res, result, 'Brick type deleted successfully');
  });

  getFormMetadata = asyncHandler(async (_req: Request, res: Response) => {
    const metadata = await settingsService.getFormMetadata();
    sendSuccess(res, metadata, 'Form metadata retrieved successfully');
  });
}
