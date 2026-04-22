import express from 'express'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'
import { NotificationController } from './notifications.controller'

const router = express.Router()
router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.BUYER, USER_ROLES.SELLER),
  NotificationController.getMyNotifications,
)
router.get('/:id', auth(USER_ROLES.ADMIN, USER_ROLES.BUYER, USER_ROLES.SELLER), NotificationController.updateNotification)
router.post(
  '/register-token',
  auth(USER_ROLES.BUYER, USER_ROLES.SELLER),
  NotificationController.registerDeviceToken,
)

export const NotificationRoutes = router
