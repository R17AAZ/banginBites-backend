import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { FavoriteServices } from './favorite.service'

const toggleFavorite = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user
  const { dishId } = req.params

  const result = await FavoriteServices.toggleFavorite(user.authId, dishId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.isFavorite ? 'Added to favorites' : 'Removed from favorites',
    data: result,
  })
})

const getMyFavorites = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user
  const result = await FavoriteServices.getMyFavorites(user.authId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Favorites fetched successfully',
    data: result,
  })
})

export const FavoriteControllers = {
  toggleFavorite,
  getMyFavorites,
}
