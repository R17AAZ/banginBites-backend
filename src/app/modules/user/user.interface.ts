import { User, UserAccount, UserMetrics, UserAddress } from '@prisma/client'

export type IUser = User & {
  password?: string // Incoming payload only
  address?: string | UserAddress // Flexible for payload vs relation
  account?: UserAccount
  metrics?: UserMetrics
  categoryIds?: string[] // For updating many-to-many categories
}

export type IUserResponse = User
