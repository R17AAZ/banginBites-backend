import { Request, Response } from 'express'
import { ReviewServices } from './review.service'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { paginationFields } from '../../../interfaces/pagination'
import pick from '../../../shared/pick'

const createReview = catchAsync(async (req: Request, res: Response) => {
  const reviewData = req.body
  const result = await ReviewServices.createReview(req.user!, reviewData)

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Review created successfully',
    data: result,
  })
})

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const reviewData = req.body
  const result = await ReviewServices.updateReview(req.user!, id, reviewData)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review updated successfully',
    data: result,
  })
})

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  let type: 'reviewerId' | 'revieweeId' | 'all';
  if (req.params.type === 'reviewer') {
    type = 'reviewerId';
  } else if (req.params.type === 'all' && req.user?.role === 'ADMIN') {
    type = 'all';
  } else {
    type = 'revieweeId';
  }
  const paginationOptions = pick(req.query, paginationFields)
  const result = await ReviewServices.getAllReviews(req.user!, type, paginationOptions)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await ReviewServices.deleteReview(id, req.user!)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review deleted successfully',
    data: result,
  })
})

const getReviewsByTarget = catchAsync(async (req: Request, res: Response) => {
  const { targetType, targetId } = req.params
  const paginationOptions = pick(req.query, paginationFields)
  
  if (targetType !== 'dish' && targetType !== 'seller') {
    throw new Error('Invalid targetType. Must be dish or seller')
  }

  const result = await ReviewServices.getReviewsByTarget(targetType, targetId, paginationOptions)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const replyToReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { reply } = req.body
  const result = await ReviewServices.replyToReview(req.user!, id, reply)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reply added successfully',
    data: result,
  })
})

const hideReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { isHidden } = req.body
  const result = await ReviewServices.hideReview(id, isHidden)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review visibility updated successfully',
    data: result,
  })
})

export const ReviewController = {
  createReview,
  updateReview,
  getAllReviews,
  deleteReview,
  getReviewsByTarget,
  replyToReview,
  hideReview,
}