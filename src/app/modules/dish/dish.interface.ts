export type IDish = {
  id: string
  sellerId: string
  categoryId: string
  name: string
  description: string
  price: number
  images?: string[]
  hygieneInfo?: string
  preparationTime?: number
  ingredients?: string[]
  isFreeDelivery: boolean
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}
