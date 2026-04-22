export interface ApiResponse<T = any> {
  statusCode: number
  success: boolean
  message: string
  data: T
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class ApiError extends Error {
  public statusCode: number
  public success: boolean

  constructor(message: string, statusCode: number, success: boolean = false) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.success = success
  }
}

// User Interfaces
export interface User {
  id: string
  email: string
  name?: string
  role: string
  status: string
  verified: boolean
  profile?: string
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// Marketplace Interfaces
export interface Category {
  id: string
  name: string
  description?: string
  image?: string
}

export interface Dish {
  id: string
  sellerId: string
  categoryId: string
  name: string
  description: string
  price: number
  images?: string[]
  isAvailable: boolean
}

export interface OrderItem {
  id: string
  dishId: string
  quantity: number
  price: number
  dish?: Dish
}

export interface Order {
  id: string
  buyerId: string
  sellerId: string
  totalAmount: number
  platformFee: number
  sellerAmount: number
  status: string
  paymentMethod: string
  paymentStatus: string
  deliveryAddress?: string
  deliveryOption?: string
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  reviewerId: string
  revieweeId: string
  dishId?: string
  rating: number
  review: string
  reply?: string
  repliedAt?: string
  isHidden: boolean
  createdAt: string
  updatedAt: string
  reviewer?: User
  reviewee?: User
  dish?: Dish
}

export type NotificationType =
  | 'REVIEW_RECEIVED'
  | 'REVIEW_REPLIED'
  | 'SYSTEM_ALERT'
  | 'LOGIN_DETECTED'
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_UPDATED'

export interface Notification {
  id: string
  fromId?: string
  toId: string
  title?: string
  body?: string
  type: NotificationType
  metadata?: any
  isAdmin?: boolean
  isRead: boolean
  createdAt: string
  updatedAt: string
  from?: User
  to?: User
}
