import { Request, Response } from 'express';
import { TransportService } from './transport.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { 
  createTransportVehicleSchema, updateTransportVehicleSchema,
  createTransportVendorSchema, updateTransportVendorSchema,
  createTransportEntrySchema, updateTransportEntrySchema,
  createVehicleEmiSchema, updateVehicleEmiSchema
} from './transport.validation';

const transportService = new TransportService();

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const data = createTransportVehicleSchema.parse(req.body);
  const vehicle = await transportService.createVehicle(data);
  res.status(201).json({ success: true, data: vehicle });
});

export const getVehicles = asyncHandler(async (req: Request, res: Response) => {
  const vehicles = await transportService.getVehicles();
  res.json({ success: true, data: vehicles });
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const data = updateTransportVehicleSchema.parse(req.body);
  const vehicle = await transportService.updateVehicle(req.params.id, data);
  res.json({ success: true, data: vehicle });
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  await transportService.deleteVehicle(req.params.id);
  res.json({ success: true, message: 'Vehicle deleted' });
});

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const data = createTransportVendorSchema.parse(req.body);
  const vendor = await transportService.createVendor(data);
  res.status(201).json({ success: true, data: vendor });
});

export const getVendors = asyncHandler(async (req: Request, res: Response) => {
  const vendors = await transportService.getVendors();
  res.json({ success: true, data: vendors });
});

export const createEntry = asyncHandler(async (req: Request, res: Response) => {
  const data = createTransportEntrySchema.parse(req.body);
  const entry = await transportService.createEntry(data);
  res.status(201).json({ success: true, data: entry });
});

export const getEntries = asyncHandler(async (req: Request, res: Response) => {
  const entries = await transportService.getEntries(req.query as any);
  res.json({ success: true, data: entries });
});

export const updateEntry = asyncHandler(async (req: Request, res: Response) => {
  const data = updateTransportEntrySchema.parse(req.body);
  const entry = await transportService.updateEntry(req.params.id, data);
  res.json({ success: true, data: entry });
});

export const deleteEntry = asyncHandler(async (req: Request, res: Response) => {
  await transportService.deleteEntry(req.params.id);
  res.json({ success: true, message: 'Entry deleted' });
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await transportService.getSummary(req.query.startDate as string, req.query.endDate as string);
  res.json({ success: true, data: summary });
});

export const createEmi = asyncHandler(async (req: Request, res: Response) => {
  const data = createVehicleEmiSchema.parse(req.body);
  const emi = await transportService.createEmi(data);
  res.status(201).json({ success: true, data: emi });
});

export const getEmis = asyncHandler(async (req: Request, res: Response) => {
  const emis = await transportService.getEmis(req.query as any);
  res.json({ success: true, data: emis });
});

export const updateEmi = asyncHandler(async (req: Request, res: Response) => {
  const data = updateVehicleEmiSchema.parse(req.body);
  const emi = await transportService.updateEmi(req.params.id, data);
  res.json({ success: true, data: emi });
});

export const deleteEmi = asyncHandler(async (req: Request, res: Response) => {
  await transportService.deleteEmi(req.params.id);
  res.json({ success: true, message: 'EMI record deleted' });
});
