import express from 'express'
import { DishControllers } from './dish.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'
import validateRequest from '../../middleware/validateRequest'
import { DishValidations } from './dish.validation'
import { fileAndBodyProcessorUsingRustFS } from '../../middleware/processReqBody'

const router = express.Router()

router.post(
  '/',
  auth(USER_ROLES.SELLER),
  fileAndBodyProcessorUsingRustFS(),
  validateRequest(DishValidations.create),
  DishControllers.createDish,
)

router.get(
  '/',
  auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.ADMIN, USER_ROLES.GUEST),
  DishControllers.getAllDishes,
)

router.get('/:id', DishControllers.getSingleDish)

router.patch(
  '/:id',
  auth(USER_ROLES.SELLER, USER_ROLES.ADMIN),
  fileAndBodyProcessorUsingRustFS(),
  validateRequest(DishValidations.update),
  DishControllers.updateDish,
)

router.delete(
  '/:id',
  auth(USER_ROLES.SELLER, USER_ROLES.ADMIN),
  DishControllers.deleteDish,
)

export const DishRoutes = router
