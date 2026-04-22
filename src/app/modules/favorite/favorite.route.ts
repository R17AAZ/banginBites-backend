import express from 'express'
import auth from '../../middleware/auth'
import { UserRole } from '@prisma/client'
import { FavoriteControllers } from './favorite.controller'

const router = express.Router()

router.patch(
  '/toggle/:dishId',
  auth(UserRole.BUYER),
  FavoriteControllers.toggleFavorite,
)

router.get(
  '/my-favorites',
  auth(UserRole.BUYER),
  FavoriteControllers.getMyFavorites,
)

export const FavoriteRoutes = router
