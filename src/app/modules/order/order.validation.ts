import { z } from 'zod'
import { PaymentMethod } from '@prisma/client'

const create = z.object({
  body: z.object({
    sellerId: z.string().nullish(),
    items: z.array(
      z.object({
        dishId: z.string({
          required_error: 'Dish ID is required',
        }),
        quantity: z.number({
          required_error: 'Quantity is required',
        }).min(1),
      }),
    ).min(1, 'At least one item is required'),
    deliveryAddress: z.string().optional(),
    deliveryOption: z.string().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      required_error: 'Payment method is required',
    }),
  }),
})

const updateStatus = z.object({
  body: z.object({
    status: z.string({
      required_error: 'Status is required',
    }),
    deliveryOTP: z.string().optional(),
  }),
})

const getMyOrders = z.object({
  query: z.object({
    filterType: z.enum(['RUNNING', 'HISTORY']).optional(),
  }),
})

export const OrderValidations = {
  create,
  updateStatus,
  getMyOrders,
}
