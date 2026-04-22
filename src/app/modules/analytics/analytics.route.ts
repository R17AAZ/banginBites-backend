import express from 'express'
import { AnalyticsControllers } from './analytics.controller'
import auth from '../../middleware/auth'
import { UserRole } from '@prisma/client'

const router = express.Router()

/**
 * Seller Dashboard Stats
 * Accessible by: SELLER, ADMIN
 */
router.get(
  '/seller',
  auth(UserRole.SELLER, UserRole.ADMIN),
  AnalyticsControllers.getSellerStats,
)

/**
 * Detailed Seller Analytics
 */
router.get(
  '/seller-detailed',
  auth(UserRole.SELLER, UserRole.ADMIN),
  AnalyticsControllers.getDetailedSellerAnalytics,
)

/**
 * Admin Platform Stats
 * Accessible by: ADMIN
 */
router.get(
  '/admin',
  auth(UserRole.ADMIN),
  AnalyticsControllers.getAdminStats,
)

/**
 * Detailed Admin Revenue Analytics
 */
router.get(
  '/admin-detailed',
  auth(UserRole.ADMIN),
  AnalyticsControllers.getAdminDetailedAnalytics,
)

export const AnalyticsRoutes = router
