import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { PaymentServices } from './payment.service'

const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.body
  const result = await PaymentServices.createPaymentIntent(orderId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payment intent created successfully',
    data: result,
  })
})

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string
  const result = await PaymentServices.handleWebhook((req as any).rawBody, signature)

  res.status(StatusCodes.OK).send(result)
})

export const PaymentControllers = {
  createPaymentIntent,
  handleWebhook,
}
