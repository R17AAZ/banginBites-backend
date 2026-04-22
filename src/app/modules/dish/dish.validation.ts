import { z } from 'zod'

const create = z.object({
  body: z.object({
    categoryId: z.string({
      required_error: 'Category ID is required',
    }),
    name: z.string({
      required_error: 'Name is required',
    }),
    description: z.string({
      required_error: 'Description is required',
    }),
    price: z.number({
      required_error: 'Price is required',
    }),
    images: z.array(z.string()).optional(),
    hygieneInfo: z.string().optional(),
    preparationTime: z.number().optional(),
    ingredients: z.array(z.string()).optional(),
    isFreeDelivery: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  }),
})

const update = z.object({
  body: z.object({
    categoryId: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    images: z.array(z.string()).optional(),
    hygieneInfo: z.string().optional(),
    preparationTime: z.number().optional(),
    ingredients: z.array(z.string()).optional(),
    isFreeDelivery: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  }),
})

export const DishValidations = {
  create,
  update,
}
