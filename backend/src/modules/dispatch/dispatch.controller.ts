import { Request, Response } from 'express';
import { DispatchService } from './dispatch.service';
import {
  createDispatchSchema,
  updateDispatchSchema,
  createCustomerSchema,
} from './dispatch.validation';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const dispatchService = new DispatchService();

export class DispatchController {
  createDispatch = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createDispatchSchema.parse(req.body);
    const dispatch = await dispatchService.createDispatch(validatedData);
    sendSuccess(res, dispatch, 'Dispatch created successfully', 201);
  });

  getDispatches = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, customerId, brickTypeId, paymentStatus } = req.query;
    const dispatches = await dispatchService.getDispatches(
      startDate as string,
      endDate as string,
      customerId as string,
      brickTypeId as string,
      paymentStatus as string
    );
    sendSuccess(res, dispatches, 'Dispatches retrieved successfully');
  });

  getDispatchById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dispatch = await dispatchService.getDispatchById(id);
    sendSuccess(res, dispatch, 'Dispatch retrieved successfully');
  });

  updateDispatch = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateDispatchSchema.parse(req.body);
    const dispatch = await dispatchService.updateDispatch(id, validatedData);
    sendSuccess(res, dispatch, 'Dispatch updated successfully');
  });

  deleteDispatch = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await dispatchService.deleteDispatch(id);
    sendSuccess(res, result, 'Dispatch deleted successfully');
  });

  // Customer management
  createCustomer = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createCustomerSchema.parse(req.body);
    const customer = await dispatchService.createCustomer(validatedData);
    sendSuccess(res, customer, 'Customer created successfully', 201);
  });

  getAllCustomers = asyncHandler(async (req: Request, res: Response) => {
    const customers = await dispatchService.getAllCustomers();
    sendSuccess(res, customers, 'Customers retrieved successfully');
  });

  getCustomerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const customer = await dispatchService.getCustomerById(id);
    sendSuccess(res, customer, 'Customer retrieved successfully');
  });
}
