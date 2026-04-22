import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { AnalyticsService } from './analytics.service'
import { JwtPayload } from 'jsonwebtoken'

const getSellerStats = catchAsync(async (req: Request, res: Response) => {
  const sellerId = (req.user as any).authId
  const result = await AnalyticsService.getSellerStats(sellerId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Seller statistics fetched successfully',
    data: result,
  })
})

const getAdminStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getAdminStats()

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin platform statistics fetched successfully',
    data: result,
  })
})

const getDetailedSellerAnalytics = catchAsync(async (req: Request, res: Response) => {
  const sellerId = (req.user! as JwtPayload).authId
  const { year, month } = req.query

  const result = await AnalyticsService.getDetailedSellerAnalytics(
    sellerId,
    parseInt(year as string) || new Date().getFullYear(),
    month ? parseInt(month as string) : undefined
  )

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Detailed analytics retrieved successfully',
    data: result,
  })
})

const getAdminDetailedAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { year } = req.query
  const result = await AnalyticsService.getAdminDetailedAnalytics(
    parseInt(year as string) || new Date().getFullYear()
  )

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Platform detailed analytics retrieved successfully',
    data: result,
  })
})

export const AnalyticsControllers = {
  getSellerStats,
  getAdminStats,
  getDetailedSellerAnalytics,
  getAdminDetailedAnalytics,
}
