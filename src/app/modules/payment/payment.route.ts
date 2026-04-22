import express from 'express'
import { PaymentControllers } from './payment.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'

const router = express.Router()

router.post(
  '/create-intent',
  auth(USER_ROLES.BUYER, USER_ROLES.ADMIN),
  PaymentControllers.createPaymentIntent,
)

router.post(
  '/webhook',
  PaymentControllers.handleWebhook,
)

export const PaymentRoutes = router
