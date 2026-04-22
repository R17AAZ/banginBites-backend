import { UserRoutes } from '../app/modules/user/user.route'
import { AuthRoutes } from '../app/modules/auth/auth.route'
import express, { Router } from 'express'
import { NotificationRoutes } from '../app/modules/notifications/notifications.route'
import { PublicRoutes } from '../app/modules/public/public.route'
import { CategoryRoutes } from '../app/modules/category/category.route'
import { DishRoutes } from '../app/modules/dish/dish.route'
import { OrderRoutes } from '../app/modules/order/order.route'
import { PaymentRoutes } from '../app/modules/payment/payment.route'
import { AnalyticsRoutes } from '../app/modules/analytics/analytics.route'
import { ReviewRoutes } from '../app/modules/review/review.route'
import { FavoriteRoutes } from '../app/modules/favorite/favorite.route'

import { MaintenanceRoutes } from '../app/modules/maintenance/maintenance.route'

const router = express.Router()

const apiRoutes: { path: string; route: Router }[] = [
  { path: '/users', route: UserRoutes },
  { path: '/auth', route: AuthRoutes },
  { path: '/notifications', route: NotificationRoutes },
  { path: '/public', route: PublicRoutes },
  { path: '/maintenance', route: MaintenanceRoutes },
  { path: '/categories', route: CategoryRoutes },
  { path: '/dishes', route: DishRoutes },
  { path: '/orders', route: OrderRoutes },
  { path: '/payments', route: PaymentRoutes },
  { path: '/analytics', route: AnalyticsRoutes },
  { path: '/reviews', route: ReviewRoutes },
  { path: '/favorites', route: FavoriteRoutes },
]

apiRoutes.forEach(route => {
  router.use(route.path, route.route)
})

export default router
