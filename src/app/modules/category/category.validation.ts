import { z } from 'zod'

const create = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
})

const update = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
})

export const CategoryValidations = {
  create,
  update,
}
