import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IReview } from './review.interface'
import prisma from '../../../shared/prisma'
import { JwtPayload } from 'jsonwebtoken'
import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'
import { NotificationType } from '@prisma/client'

const createReview = async (user: JwtPayload, payload: any) => {
  const reviewerId = user.authId
  const { revieweeId, dishId, orderId, rating, review } = payload

  if (reviewerId === revieweeId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot review yourself')
  }

  // 1. Validate that the order exists, belongs to the reviewer, is DELIVERED, and contains the dish
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
  }

  if (order.buyerId !== reviewerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only review your own orders')
  }

  if (order.status !== 'DELIVERED') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You can only review items after they have been delivered')
  }

  const isDishInOrder = order.items.some(item => item.dishId === dishId)
  if (!isDishInOrder) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'The dish you are trying to review was not part of this order')
  }

  // Double check if revieweeId matches the order's seller
  if (order.sellerId !== revieweeId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'The seller ID does not match the order')
  }

  // 1.1 Check if a review already exists for this order item
  const existingReview = await prisma.review.findFirst({
    where: {
      orderId,
      dishId,
      reviewerId,
    },
  })

  if (existingReview) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have already reviewed this dish for this order',
    )
  }

  return await prisma.$transaction(async tx => {
    // 2. Create the review
    const result = await tx.review.create({
      data: {
        reviewerId,
        revieweeId,
        dishId,
        orderId,
        rating,
        review,
      },
      include: {
        reviewer: { select: { id: true, name: true, profile: true } },
        reviewee: { select: { id: true, name: true, profile: true } },
        dish: { select: { name: true } },
      },
    })

    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Review')
    }

    // 3. Create notification for the reviewee
    await tx.notification.create({
      data: {
        fromId: reviewerId,
        toId: revieweeId,
        title: 'New Dish Review',
        body: `${result.reviewer.name} gave ${result.dish?.name} a ${rating} star review: "${review.substring(0, 50)}${review.length > 50 ? '...' : ''}"`,
        type: NotificationType.REVIEW_RECEIVED,
        metadata: {
          reviewId: result.id,
          dishId,
          orderId,
        },
      },
    })

    // 4. Update Seller Metrics (Aggregate)
    let metrics = await tx.userMetrics.findUnique({
      where: { userId: revieweeId },
    })

    if (!metrics) {
      metrics = await tx.userMetrics.create({
        data: { userId: revieweeId },
      })
    }

    const currentTotalReview = metrics.totalReview || 0
    const currentRating = metrics.rating || 0
    const newTotalReview = currentTotalReview + 1
    const newRating = (currentRating * currentTotalReview + rating) / newTotalReview

    await tx.userMetrics.update({
      where: { userId: revieweeId },
      data: {
        totalReview: newTotalReview,
        rating: newRating,
      },
    })

    // 5. Update Dish Metrics (Aggregate)
    const dish = await tx.dish.findUnique({
      where: { id: dishId },
      select: { rating: true, totalReview: true },
    })

    if (dish) {
      const dishTotalReview = dish.totalReview || 0
      const dishRating = dish.rating || 0
      const newDishTotalReview = dishTotalReview + 1
      const newDishRating =
        (dishRating * dishTotalReview + rating) / newDishTotalReview

      await tx.dish.update({
        where: { id: dishId },
        data: {
          totalReview: newDishTotalReview,
          rating: newDishRating,
        },
      })
    }

    return result
  })
}

const getAllReviews = async (
  user: JwtPayload,
  type: 'reviewerId' | 'revieweeId' | 'all',
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  const where: any = {}
  
  if (type !== 'all') {
    where[type] = user.authId
  }

  if (user.role !== 'ADMIN') {
    where.isHidden = false
  }

  const [result, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        reviewer: { select: { id: true, name: true, profile: true } },
        reviewee: { select: { id: true, name: true, profile: true } },
        dish: { include: { category: true } },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.review.count({ where }),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

const updateReview = async (user: JwtPayload, id: string, payload: Partial<IReview>) => {
  return await prisma.$transaction(async tx => {
    const existingReview = await tx.review.findUnique({
      where: { id },
    })

    if (!existingReview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
    }

    if (existingReview.reviewerId !== user.authId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Not authorized to update this review')
    }

    const oldRating = existingReview.rating
    const newRating = payload.rating ?? oldRating

    if (payload.rating !== undefined) {
      // 1. Update reviewee (Seller) metrics
      const metrics = await tx.userMetrics.findUnique({
        where: { userId: existingReview.revieweeId },
      })

      if (metrics && metrics.totalReview > 0) {
        const recalculatedRating =
          (metrics.rating * metrics.totalReview - oldRating + newRating) /
          metrics.totalReview

        await tx.userMetrics.update({
          where: { userId: existingReview.revieweeId },
          data: { rating: recalculatedRating },
        })
      }

      // 2. Update Dish metrics if available
      if (existingReview.dishId) {
        const dish = await tx.dish.findUnique({
          where: { id: existingReview.dishId },
        })

        if (dish && dish.totalReview > 0) {
          const recalculatedDishRating =
            (dish.rating * dish.totalReview - oldRating + newRating) /
            dish.totalReview

          await tx.dish.update({
            where: { id: existingReview.dishId },
            data: { rating: recalculatedDishRating },
          })
        }
      }
    }

    await tx.review.update({
      where: { id },
      data: {
        rating: payload.rating,
        review: payload.review,
      },
    })

    return 'Review updated successfully'
  })
}

const deleteReview = async (id: string, user: JwtPayload) => {
  return await prisma.$transaction(async tx => {
    const existingReview = await tx.review.findUnique({
      where: { id },
    })

    if (!existingReview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
    }

    if (existingReview.reviewerId !== user.authId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Not authorized to delete this review')
    }

    // 1. Update Seller Metrics
    const metrics = await tx.userMetrics.findUnique({
      where: { userId: existingReview.revieweeId },
    })

    if (metrics) {
      const newTotalReview = Math.max(metrics.totalReview - 1, 0)
      let newRating = 0
      if (newTotalReview > 0) {
        newRating =
          (metrics.rating * metrics.totalReview - existingReview.rating) / newTotalReview
      }

      await tx.userMetrics.update({
        where: { userId: existingReview.revieweeId },
        data: {
          totalReview: newTotalReview,
          rating: newRating,
        },
      })
    }

    // 2. Update Dish Metrics if available
    if (existingReview.dishId) {
      const dish = await tx.dish.findUnique({
        where: { id: existingReview.dishId },
      })

      if (dish) {
        const newDishTotalReview = Math.max(dish.totalReview - 1, 0)
        let newDishRating = 0
        if (newDishTotalReview > 0) {
          newDishRating =
            (dish.rating * dish.totalReview - existingReview.rating) /
            newDishTotalReview
        }

        await tx.dish.update({
          where: { id: existingReview.dishId },
          data: {
            totalReview: newDishTotalReview,
            rating: newDishRating,
          },
        })
      }
    }

    await tx.review.delete({
      where: { id },
    })

    return 'Review deleted successfully'
  })
}

const getReviewsByTarget = async (
  targetType: 'seller' | 'dish',
  targetId: string,
  paginationOptions: IPaginationOptions,
  user?: JwtPayload
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  const where: any = targetType === 'seller' ? { revieweeId: targetId } : { dishId: targetId }
  
  if (!user || user.role !== 'ADMIN') {
    where.isHidden = false
  }

  const [result, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        reviewer: { select: { id: true, name: true, profile: true } },
        reviewee: { select: { id: true, name: true, profile: true } },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.review.count({ where }),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

const replyToReview = async (user: JwtPayload, id: string, replyMessage: string) => {
  return await prisma.$transaction(async tx => {
    const existingReview = await tx.review.findUnique({
      where: { id },
      include: { reviewer: true, reviewee: true },
    })

    if (!existingReview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
    }

    if (user.role !== 'ADMIN' && existingReview.revieweeId !== user.authId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Not authorized to reply to this review')
    }

    const updatedReview = await tx.review.update({
      where: { id },
      data: {
        reply: replyMessage,
        repliedAt: new Date(),
      },
    })

    await tx.notification.create({
      data: {
        fromId: user.authId,
        toId: existingReview.reviewerId,
        title: 'Review Reply',
        body: `${user.role === 'ADMIN' ? 'Admin' : existingReview.reviewee.name} has replied to your review.`,
        type: NotificationType.REVIEW_REPLIED,
        metadata: {
          reviewId: existingReview.id,
          dishId: existingReview.dishId,
        },
      },
    })

    return updatedReview
  })
}

const hideReview = async (id: string, isHidden: boolean) => {
  const existingReview = await prisma.review.findUnique({
    where: { id },
  })

  if (!existingReview) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
  }

  const updatedReview = await prisma.review.update({
    where: { id },
    data: {
      isHidden,
    },
  })

  return updatedReview
}

export const ReviewServices = {
  createReview,
  getAllReviews,
  updateReview,
  deleteReview,
  replyToReview,
  hideReview,
  getReviewsByTarget,
}
