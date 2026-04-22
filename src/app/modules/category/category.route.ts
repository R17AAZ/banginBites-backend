import express from 'express'
import { CategoryControllers } from './category.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'
import validateRequest from '../../middleware/validateRequest'
import { CategoryValidations } from './category.validation'
import { fileAndBodyProcessorUsingRustFS } from '../../middleware/processReqBody'

const router = express.Router()

router.post(
  '/',
  auth(USER_ROLES.ADMIN),
  fileAndBodyProcessorUsingRustFS(),
  validateRequest(CategoryValidations.create),
  CategoryControllers.createCategory,
)

router.get('/', CategoryControllers.getAllCategories)

router.get('/:id', CategoryControllers.getSingleCategory)

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN),
  fileAndBodyProcessorUsingRustFS(),
  validateRequest(CategoryValidations.update),
  CategoryControllers.updateCategory,
)

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN),
  CategoryControllers.deleteCategory,
)

export const CategoryRoutes = router
