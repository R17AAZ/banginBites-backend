import { Request, Response, NextFunction } from 'express'

import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'

import { UserServices } from './user.service'



const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.updateProfile(req.user!, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  })
})


const getSellerProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getSellerProfile(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Seller profile fetched successfully',
    data: result,
  })
})

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getProfile(req.user!)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: result,
  })
})

import pick from '../../../shared/pick'
import { paginationFields } from '../../../interfaces/pagination'

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields)
  const filter = pick(req.query, ['role', 'status', 'searchTerm'])
  const result = await UserServices.getAllUsers(paginationOptions, filter)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Users retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body
  const result = await UserServices.updateUserStatus(id, status)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User status updated successfully',
    data: result,
  })
})

export const UserController = {
  updateProfile,
  getSellerProfile,
  getProfile,
  getAllUsers,
  updateUserStatus,
}
