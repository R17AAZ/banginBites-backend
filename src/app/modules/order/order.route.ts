import express from 'express'
import { OrderControllers } from './order.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'
import validateRequest from '../../middleware/validateRequest'
import { OrderValidations } from './order.validation'

const router = express.Router()

router.post(
  '/',
  auth(USER_ROLES.BUYER, USER_ROLES.ADMIN),
  validateRequest(OrderValidations.create),
  OrderControllers.createOrder,
)

router.get(
  '/my-orders',
  auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.ADMIN),
  validateRequest(OrderValidations.getMyOrders),
  OrderControllers.getMyOrders,
)

router.get(
  '/:id',
  auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.ADMIN),
  OrderControllers.getSingleOrder,
)

router.patch(
  '/:id/status',
  auth(USER_ROLES.SELLER, USER_ROLES.ADMIN),
  validateRequest(OrderValidations.updateStatus),
  OrderControllers.updateOrderStatus,
)

export const OrderRoutes = router
