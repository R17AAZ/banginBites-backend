import { Category } from '@prisma/client'
import prisma from '../../../shared/prisma'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

const createCategory = async (
  payload: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Category> => {
  const isExist = await prisma.category.findUnique({
    where: { name: payload.name },
  })

  if (isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category already exists')
  }

  const result = await prisma.category.create({
    data: payload,
  })
  return result
}

const getAllCategories = async (): Promise<Category[]> => {
  const result = await prisma.category.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return result
}

const getSingleCategory = async (id: string): Promise<Category | null> => {
  const result = await prisma.category.findUnique({
    where: { id },
  })
  return result
}

const updateCategory = async (
  id: string,
  payload: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Category | null> => {
  const isExist = await prisma.category.findUnique({
    where: { id },
  })

  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found')
  }

  const result = await prisma.category.update({
    where: { id },
    data: payload,
  })
  return result
}

const deleteCategory = async (id: string): Promise<Category | null> => {
  const isExist = await prisma.category.findUnique({
    where: { id },
  })

  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found')
  }

  const result = await prisma.category.delete({
    where: { id },
  })
  return result
}

export const CategoryServices = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
}
