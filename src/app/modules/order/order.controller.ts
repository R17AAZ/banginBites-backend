import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { OrderServices } from './order.service'
import pick from '../../../shared/pick'
import { paginationFields } from '../../../interfaces/pagination'


const createOrder = catchAsync(async (req: Request, res: Response) => {
  const buyerId = (req.user as any).authId
  const result = await OrderServices.createOrder(buyerId, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order placed successfully',
    data: result,
  })
})

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).authId
  const role = (req.user as any).role
  const filterType = req.query.filterType as string | undefined
  const paginationOptions = pick(req.query, paginationFields)

  const result = await OrderServices.getMyOrders(userId, role, filterType, paginationOptions)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Orders fetched successfully',
    meta: result.meta,
    data: result.data,
  })
})

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).authId
  const role = (req.user as any).role
  const result = await OrderServices.getSingleOrder(req.params.id, userId, role)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order fetched successfully',
    data: result,
  })
})

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const sellerId = (req.user as any).authId
  const { status, deliveryOTP } = req.body
  const result = await OrderServices.updateOrderStatus(req.params.id, sellerId, status, deliveryOTP)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order status updated successfully',
    data: result,
  })
})

export const OrderControllers = {
  createOrder,
  getMyOrders,
  getSingleOrder,
  updateOrderStatus,
}
