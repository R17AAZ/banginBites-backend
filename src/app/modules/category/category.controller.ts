import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { CategoryServices } from './category.service'

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.createCategory(req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Category created successfully',
    data: result,
  })
})

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.getAllCategories()

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Categories fetched successfully',
    data: result,
  })
})

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.getSingleCategory(req.params.id)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Category fetched successfully',
    data: result,
  })
})

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.updateCategory(req.params.id, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Category updated successfully',
    data: result,
  })
})

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.deleteCategory(req.params.id)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Category deleted successfully',
    data: result,
  })
})

export const CategoryControllers = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
}
