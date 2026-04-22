import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IUser } from './user.interface'
import prisma from '../../../shared/prisma'
import { UserRole, UserStatus } from '@prisma/client'
import { logger } from '../../../shared/logger'
import config from '../../../config'
import bcrypt from 'bcrypt'
import { JwtPayload } from 'jsonwebtoken'

const updateProfile = async (user: JwtPayload, payload: Partial<IUser>) => {
  const { address, account, metrics, categoryIds, ...profileData } = payload

  // Filter sensitive fields to prevent unauthorized modifications
  const forbiddenFields = [
    'id',
    'email',
    'role',
    'status',
    'isVerified',
    'createdAt',
    'updatedAt',
  ]
  const filteredData = Object.keys(profileData)
    .filter(key => !forbiddenFields.includes(key))
    .reduce((obj: any, key) => {
      obj[key] = (profileData as any)[key]
      return obj
    }, {})

  return await prisma.$transaction(async tx => {
    // 1. Update core profile
    const updatedUser = await tx.user.update({
      where: {
        id: user.authId,
        status: { not: UserStatus.DELETED },
      },
      data: {
        ...filteredData,
        categories: categoryIds
          ? {
            set: categoryIds.map((id: string) => ({ id })),
          }
          : undefined,
      },
    })

    if (!updatedUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    // 2. Handle address update
    if (address) {
      if (typeof address === 'string') {
        await tx.userAddress.upsert({
          where: { userId: user.authId },
          create: {
            street: address,
            userId: user.authId,
          },
          update: { street: address },
        })
      } else {
        await tx.userAddress.upsert({
          where: { userId: user.authId },
          create: {
            ...(address as any),
            userId: user.authId,
          },
          update: address as any,
        })
      }
    }

    // Re-fetch to get complete updated profile
    return await tx.user.findUnique({
      where: { id: user.authId },
      include: {
        address: true,
        metrics: true,
        categories: true,
      },
    })
  })
}


const createAdmin = async (): Promise<IUser | null> => {
  const adminEmail = config.admin.email as string
  const adminPassword = config.admin.password as string

  if (!adminEmail || !adminPassword) {
    logger.warn('Admin credentials not found in config, skipping admin seeding.')
    return null
  }

  const isAdminExist = await prisma.user.findFirst({
    where: {
      email: adminEmail,
      status: { not: UserStatus.DELETED },
    },
  })

  if (isAdminExist) {
    logger.log('info', 'Admin account already exist, skipping creation.🦥')
    return isAdminExist as IUser
  }

  const hashedPassword = await bcrypt.hash(
    adminPassword,
    Number(config.bcrypt_salt_rounds),
  )

  const result = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      verified: true,
      account: {
        create: {
          password: hashedPassword,
        }
      },
      metrics: {
        create: {}
      }
    },
    include: {
      account: true,
      metrics: true,
    }
  })

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create admin')
  }

  return result as IUser
}

const getSellerProfile = async (id: string) => {
  const seller = await prisma.user.findFirst({
    where: {
      id,
      role: UserRole.SELLER,
      status: { not: UserStatus.DELETED },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profile: true,
      metrics: true,
      categories: true,
      dishes: {
        where: { isAvailable: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
        },
      },
    },
  })

  if (!seller) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Seller not found')
  }

  return seller
}

const getProfile = async (user: JwtPayload) => {
  const result = await prisma.user.findUnique({
    where: {
      id: user.authId,
      status: { not: UserStatus.DELETED },
    },
    include: {
      address: true,
      metrics: true,
      categories: true,
    },
  })

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  return result
}

import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'

const getAllUsers = async (
  paginationOptions: IPaginationOptions,
  filter: Record<string, any>,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  const where: any = { 
    status: { not: UserStatus.DELETED },
    role: { not: UserRole.ADMIN }
  }

  if (filter.role) where.role = filter.role
  if (filter.status) where.status = filter.status
  if (filter.searchTerm) {
    where.OR = [
      { name: { contains: filter.searchTerm, mode: 'insensitive' } },
      { email: { contains: filter.searchTerm, mode: 'insensitive' } },
    ]
  }

  const [result, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        metrics: true,
        address: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.user.count({ where }),
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

const updateUserStatus = async (id: string, status: UserStatus) => {
  const result = await prisma.user.update({
    where: { id },
    data: { status },
  })

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  return result
}

export const UserServices = {
  updateProfile,
  createAdmin,
  getSellerProfile,
  getProfile,
  getAllUsers,
  updateUserStatus,
}
