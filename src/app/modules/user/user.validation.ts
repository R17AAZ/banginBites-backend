import { z } from 'zod'
import { USER_ROLES } from '../../../enum/user'
import { profile } from 'console'

const createUserZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email(),
    password: z.string({ required_error: 'Password is required' }).min(6),
    name: z.string({ required_error: 'Name is required' }).optional(),
    phone: z.string({ required_error: 'Phone is required' }).optional(),
    address: z.string().optional(),
    role: z.enum(
      [
        USER_ROLES.ADMIN,



      ],
      {
        message: 'Role must be one of admin, user, guest',
      },
    ),
  }),
})

const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().or(z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    })).optional(),
    profile: z.string().optional(),
    categoryIds: z.array(z.string()).optional(),
  }),
})

export const UserValidations = { createUserZodSchema, updateUserZodSchema }
