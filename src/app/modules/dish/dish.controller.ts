import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { DishServices } from './dish.service'
import pick from '../../../shared/pick'
import { paginationFields } from '../../../interfaces/pagination'


const createDish = catchAsync(async (req: Request, res: Response) => {
  const sellerId = (req.user as any).authId
  const result = await DishServices.createDish(sellerId, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dish created successfully',
    data: result,
  })
})

const getAllDishes = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'cuisine', 'minPrice', 'maxPrice', 'categoryId', 'sellerId'])
  const paginationOptions = pick(req.query, paginationFields)
  const userId = (req.user as any)?.authId
  const role = (req.user as any)?.role

  const result = await DishServices.getAllDishes(filters, paginationOptions, userId, role)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dishes fetched successfully',
    meta: result.meta,
    data: result.data,
  })
})

const getSingleDish = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)?.authId
  const result = await DishServices.getSingleDish(req.params.id, userId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dish fetched successfully',
    data: result,
  })
})

const updateDish = catchAsync(async (req: Request, res: Response) => {
  const sellerId = (req.user as any).authId
  const result = await DishServices.updateDish(req.params.id, sellerId, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dish updated successfully',
    data: result,
  })
})

const deleteDish = catchAsync(async (req: Request, res: Response) => {
  const sellerId = (req.user as any).authId
  const result = await DishServices.deleteDish(req.params.id, sellerId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dish deleted successfully',
    data: result,
  })
})

export const DishControllers = {
  createDish,
  getAllDishes,
  getSingleDish,
  updateDish,
  deleteDish,
}
