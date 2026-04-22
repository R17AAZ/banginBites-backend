import { Order, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'

export type IOrderItemPayload = {
  dishId: string
  quantity: number
}

export type IOrderPayload = {
  sellerId?: string
  items: IOrderItemPayload[]
  deliveryAddress?: string
  deliveryOption?: string
  paymentMethod: PaymentMethod
  platform?: 'MOBILE' | 'DESKTOP'
}

export type IOrder = {
  id: string
  buyerId: string
  sellerId: string
  totalAmount: number
  platformFee: number
  sellerAmount: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  deliveryAddress?: string
  deliveryOption?: string
  createdAt: Date
  updatedAt: Date
}

export type IOrderResponse = {
  order: Order
  checkoutUrl?: string
}
