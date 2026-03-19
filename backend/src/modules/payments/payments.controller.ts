import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { sendSuccess } from '../../utils/response';

const paymentsService = new PaymentsService();

export class PaymentsController {
  async createPayment(req: Request, res: Response) {
    const payment = await paymentsService.createPayment(req.body);
    return sendSuccess(res, payment, 'Payment recorded successfully', 201);
  }

  async getPaymentsByPerson(req: Request, res: Response) {
    const { personId } = req.params;
    const payments = await paymentsService.getPaymentsByPerson(personId);
    return sendSuccess(res, payments, 'Payments retrieved successfully');
  }
}
