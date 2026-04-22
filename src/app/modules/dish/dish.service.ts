import { Dish, Prisma } from '@prisma/client'
import prisma from '../../../shared/prisma'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'
import { RustFSHelper } from '../../../helpers/image/rustFsHelper'

const createDish = async (
  sellerId: string,
  payload: Omit<Dish, 'id' | 'createdAt' | 'updatedAt' | 'sellerId'>,
): Promise<Dish> => {
  const result = await prisma.dish.create({
    data: {
      ...payload,
      sellerId,
      images: payload.images as Prisma.InputJsonValue,
      ingredients: payload.ingredients as Prisma.InputJsonValue,
    } as Prisma.DishUncheckedCreateInput,
    include: {
      category: true,
      seller: { select: { name: true, profile: true } },
    },
  })
  return result
}

const getAllDishes = async (
  filters: any,
  paginationOptions: IPaginationOptions,
  userId?: string,
  role?: string,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  const { searchTerm, cuisine, minPrice, maxPrice, ...filterData } = filters

  const andConditions: Prisma.DishWhereInput[] = []
  
  // Availability filter logic:
  // 1. ADMIN sees everything.
  // 2. SELLER sees their own dishes (including unavailable) but only available dishes from others.
  // 3. OTHERS (BUYER/GUEST) see only available dishes.
  if (role === 'SELLER') {
    andConditions.push({
      OR: [{ isAvailable: true }, { sellerId: userId }],
    })
  } else if (role !== 'ADMIN') {
    andConditions.push({ isAvailable: true })
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    })
  }

  if (cuisine) {
    andConditions.push({
      category: {
        is: {
          name: {
            contains: cuisine,
            mode: 'insensitive',
          },
        },
      },
    })
  }

  if (minPrice !== undefined) {
    andConditions.push({
      price: { gte: Number(minPrice) },
    })
  }

  if (maxPrice !== undefined) {
    andConditions.push({
      price: { lte: Number(maxPrice) },
    })
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    } as Prisma.DishWhereInput)
  }

  const whereConditions: Prisma.DishWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {}

  const [result, total] = await Promise.all([
    prisma.dish.findMany({
      where: whereConditions,
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            profile: true,
            metrics: true,
          },
        },
        ...(userId && { favoriteBy: { where: { userId } } }),
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.dish.count({ where: whereConditions }),
  ])

  const formattedData = result.map(dish => ({
    ...dish,
    isFavorite: userId ? (dish as any).favoriteBy.length > 0 : false,
  }))

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: formattedData,
  }
}

const getSingleDish = async (id: string, userId?: string): Promise<any | null> => {
  const result = await prisma.dish.findUnique({
    where: { id },
    include: {
      category: true,
      seller: {
        select: {
          id: true,
          name: true,
          profile: true,
          metrics: true,
        },
      },
      reviews: {
        include: {
          reviewer: { select: { name: true, profile: true } },
        },
      },
      ...(userId && { favoriteBy: { where: { userId } } }),
    },
  })

  if (!result) return null

  return {
    ...result,
    isFavorite: userId ? (result as any).favoriteBy.length > 0 : false,
  }
}

const updateDish = async (
  id: string,
  sellerId: string,
  payload: Partial<Omit<Dish, 'id' | 'createdAt' | 'updatedAt' | 'sellerId'>>,
): Promise<Dish | null> => {
  const isExist = await prisma.dish.findUnique({
    where: { id },
  })

  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Dish not found')
  }

  if (isExist.sellerId !== sellerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized to update this dish')
  }

  // Handle image deletion from storage if they were removed
  if (payload.images && Array.isArray(payload.images)) {
    const oldImages = (isExist.images as string[]) || []
    const newImages = (payload.images as string[]) || []

    const removedImages = oldImages.filter(img => !newImages.includes(img))

    for (const imgUrl of removedImages) {
      try {
        await RustFSHelper.deleteFromRustFS(imgUrl)
      } catch (error) {
        console.error(`Failed to delete image: ${imgUrl}`, error)
      }
    }
  }

  const result = await prisma.dish.update({
    where: { id },
    data: {
      ...payload,
      ...(payload.images !== undefined && { images: payload.images as Prisma.InputJsonValue }),
      ...(payload.ingredients !== undefined && { ingredients: payload.ingredients as Prisma.InputJsonValue }),
    } as Prisma.DishUncheckedUpdateInput,
    include: { category: true },
  })
  return result
}

const deleteDish = async (id: string, sellerId: string): Promise<Dish | null> => {
  const isExist = await prisma.dish.findUnique({
    where: { id },
  })

  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Dish not found')
  }

  if (isExist.sellerId !== sellerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized to delete this dish')
  }

  // Delete images from storage
  const images = (isExist.images as string[]) || []
  for (const imgUrl of images) {
    try {
      await RustFSHelper.deleteFromRustFS(imgUrl)
    } catch (error) {
      console.error(`Failed to delete image: ${imgUrl}`, error)
    }
  }

  const result = await prisma.dish.delete({
    where: { id },
  })
  return result
}

export const DishServices = {
  createDish,
  getAllDishes,
  getSingleDish,
  updateDish,
  deleteDish,
}
