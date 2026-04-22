import { Favorite } from '@prisma/client'
import prisma from '../../../shared/prisma'

const toggleFavorite = async (userId: string, dishId: string): Promise<{ isFavorite: boolean }> => {
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_dishId: {
        userId,
        dishId,
      },
    },
  })

  if (existingFavorite) {
    await prisma.favorite.delete({
      where: { id: existingFavorite.id },
    })
    return { isFavorite: false }
  } else {
    await prisma.favorite.create({
      data: {
        userId,
        dishId,
      },
    })
    return { isFavorite: true }
  }
}

const getMyFavorites = async (userId: string) => {
  const result = await prisma.favorite.findMany({
    where: { userId },
    include: {
      dish: {
        include: {
          category: true,
          seller: { select: { id: true, name: true, profile: true, metrics: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return result.map(fav => fav.dish)
}

export const FavoriteServices = {
  toggleFavorite,
  getMyFavorites,
}
