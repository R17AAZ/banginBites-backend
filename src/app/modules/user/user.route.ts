import express from 'express'
import { UserController } from './user.controller'
import { UserValidations } from './user.validation'
import validateRequest from '../../middleware/validateRequest'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'
import {
  fileAndBodyProcessorUsingRustFS,
} from '../../middleware/processReqBody'

const router = express.Router()


router.patch(
  '/profile',
  auth(

    USER_ROLES.ADMIN,

    USER_ROLES.BUYER,
    USER_ROLES.SELLER,
  ),
  fileAndBodyProcessorUsingRustFS(),
  validateRequest(UserValidations.updateUserZodSchema),
  UserController.updateProfile,
)

router.get(
  '/my-profile',
  auth(

    USER_ROLES.ADMIN,

    USER_ROLES.BUYER,
    USER_ROLES.SELLER,
  ),
  UserController.getProfile,
)

router.get('/seller/:id', UserController.getSellerProfile)

router.get(
  '/',
  auth(USER_ROLES.ADMIN),
  UserController.getAllUsers,
)

router.patch(
  '/:id/status',
  auth(USER_ROLES.ADMIN),
  UserController.updateUserStatus,
)

export const UserRoutes = router
