import { PublicContent, Faq } from '@prisma/client'

export type IPublic = PublicContent
export type IFaq = Faq

export interface IContact {
  name: string
  email: string
  phone: string
  country: string
  message: string
  createdAt?: Date
  updatedAt?: Date
}
