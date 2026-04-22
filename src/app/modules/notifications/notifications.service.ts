import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { JwtPayload } from 'jsonwebtoken'
import prisma from '../../../shared/prisma'
import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'

const getNotifications = async (user: JwtPayload, paginationOptions: IPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(paginationOptions)
  
  const [result, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { toId: user.authId },
      include: {
        from: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        to: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.notification.count({ where: { toId: user.authId } }),
    prisma.notification.count({ where: { toId: user.authId, isRead: false } }),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
    data: result,
  }
}

const readNotification = async (id: string) => {
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })
    return 'Notification read successfully'
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to mark notification as read')
  }
}

const readAllNotifications = async (user: JwtPayload) => {
  try {
    await prisma.notification.updateMany({
      where: { toId: user.authId },
      data: { isRead: true },
    })
    return 'All notifications read successfully'
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to mark all notifications as read')
  }
}

const registerDeviceToken = async (user: JwtPayload, payload: { fcmToken: string, deviceType?: string }) => {
  const result = await prisma.userDevice.upsert({
    where: { fcmToken: payload.fcmToken },
    update: {
      userId: user.authId,
      deviceType: payload.deviceType || 'web',
    },
    create: {
      userId: user.authId,
      fcmToken: payload.fcmToken,
      deviceType: payload.deviceType || 'web',
    },
  })
  return result
}

export const NotificationServices = {
  getNotifications,
  readNotification,
  readAllNotifications,
  registerDeviceToken,
}
