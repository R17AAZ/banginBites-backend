import { z } from 'zod'

export const ReviewValidations = {
  create: z.object({
    body: z.object({
      revieweeId: z.string({
        required_error: 'Reviewee ID is required',
      }),
      dishId: z.string({
        required_error: 'Dish ID is required',
      }),
      orderId: z.string({
        required_error: 'Order ID is required',
      }),
      rating: z.number().min(1).max(5),
      review: z.string().min(1, 'Review text is required'),
    }),
  }),

  update: z.object({
    body: z.object({
      rating: z.number().min(1).max(5).optional(),
      review: z.string().optional(),
    }),
  }),

  reply: z.object({
    body: z.object({
      reply: z.string({
        required_error: 'Reply message is required',
      }).min(1, 'Reply message cannot be empty'),
    }),
  }),

  hide: z.object({
    body: z.object({
      isHidden: z.boolean({
        required_error: 'isHidden status is required',
      }),
    }),
  }),
}
