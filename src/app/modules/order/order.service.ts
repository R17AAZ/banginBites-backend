import { Order, OrderStatus, PaymentMethod, PaymentStatus, NotificationType } from '@prisma/client'
import prisma from '../../../shared/prisma'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import { IOrderPayload, IOrderResponse } from './order.interface'
import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'
import { StripeHelper } from '../../../helpers/stripeHelper'
import config from '../../../config'
import { sendNotification } from '../../../helpers/notificationHelper'

const createOrder = async (buyerId: string, payload: IOrderPayload): Promise<IOrderResponse> => {
  const { sellerId, items, deliveryAddress, deliveryOption, paymentMethod } = payload

  const result = await prisma.$transaction(async tx => {
    // 1. Calculate total amount
    let totalAmount = 0
    let effectiveSellerId = sellerId
    const orderItemsData = []

    for (const item of items) {
      const dish = await tx.dish.findUnique({
        where: { id: item.dishId },
      })

      if (!dish) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Dish not found: ${item.dishId}`)
      }

      if (!dish.isAvailable) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Dish is not available: ${dish.name}`)
      }

      // Infer sellerId from the first dish if not provided
      if (!effectiveSellerId) {
        effectiveSellerId = dish.sellerId
      }

      if (dish.sellerId !== effectiveSellerId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Dish ${dish.name} does not belong to the specified seller`)
      }

      const itemTotal = dish.price * item.quantity
      totalAmount += itemTotal

      orderItemsData.push({
        dishId: dish.id,
        quantity: item.quantity,
        price: dish.price,
      })
    }

    if (!effectiveSellerId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Could not determine seller for this order')
    }

    // 2. Calculate 8% platform fee
    const platformFee = totalAmount * 0.08
    const sellerAmount = totalAmount - platformFee

    // 3. Create the order
    const order = await tx.order.create({
      data: {
        buyerId,
        sellerId: effectiveSellerId,
        totalAmount,
        platformFee,
        sellerAmount,
        deliveryAddress,
        deliveryOption,
        paymentMethod,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        deliveryOTP: Math.floor(1000 + Math.random() * 9000).toString(),
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { dish: true },
        },
        buyer: { select: { name: true, email: true } },
        seller: { select: { name: true, email: true } },
      },
    })

    let checkoutUrl: string | undefined

    if (paymentMethod === PaymentMethod.ONLINE) {
      // Default to web URLs
      let successUrl = `${config.client_url}/order-success?orderId=${order.id}`
      let cancelUrl = `${config.client_url}/order-failed?orderId=${order.id}`

      // Override for Mobile/Desktop Deep Links
      if (payload.platform === 'MOBILE') {
        successUrl = `banginbites://order-success?orderId=${order.id}`
        cancelUrl = `banginbites://order-failed?orderId=${order.id}`
      } else if (payload.platform === 'DESKTOP') {
        successUrl = `banginbites-desktop://order-success?orderId=${order.id}`
        cancelUrl = `banginbites-desktop://order-failed?orderId=${order.id}`
      }

      const session = await StripeHelper.createCheckoutSession(
        totalAmount,
        'gbp',
        {
          orderId: order.id,
          buyerId,
        },
        successUrl,
        cancelUrl,
        order.buyer.email,
      )

      checkoutUrl = session.url as string

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          method: PaymentMethod.ONLINE,
          status: PaymentStatus.PENDING,
          transactionId: session.id, // Store session ID as transaction ID
        },
      })
    }

    return { order, checkoutUrl }
  })

  // 4. Real-time notification for seller
  await sendNotification(
    {
      authId: buyerId,
      name: (result.order as any).buyer?.name || 'Customer'
    },
    result.order.sellerId,
    'New Order Received',
    `You have a new order from ${(result.order as any).buyer?.name || 'Customer'} for £${result.order.totalAmount.toFixed(2)}`
  )

  return result
}

const getMyOrders = async (
  userId: string,
  role: string,
  filterType: string | undefined,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  const where: any = role === 'BUYER' ? { buyerId: userId } : { sellerId: userId }

  if (filterType === 'HISTORY') {
    where.status = { in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] }
  } else if (filterType === 'RUNNING') {
    where.status = { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY] }
  }

  const [result, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: { dish: true },
        },
        reviews: true,
        buyer: { select: { id: true, name: true, profile: true } },
        seller: { select: { id: true, name: true, profile: true } },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.order.count({ where }),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

const getSingleOrder = async (id: string, userId: string, role: string): Promise<Order | null> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { dish: true },
      },
      reviews: true,
      buyer: { select: { id: true, name: true, profile: true, email: true } },
      seller: { select: { id: true, name: true, profile: true, email: true } },
      payment: true,
    },
  })

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
  }

  if (role === 'BUYER' && order.buyerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
  }

  if (role === 'SELLER' && order.sellerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
  }

  return order
}

const updateOrderStatus = async (
  id: string,
  sellerId: string,
  status: OrderStatus,
  deliveryOTP?: string
): Promise<Order | null> => {
  const order = await prisma.order.findUnique({
    where: { id },
  })

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
  }

  if (order.sellerId !== sellerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized to update this order')
  }

  const updateData: any = { status }

  if (status === OrderStatus.DELIVERED) {
    if (!deliveryOTP) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Delivery OTP is required to mark as delivered')
    }
    if (order.deliveryOTP !== deliveryOTP) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Delivery OTP')
    }
    updateData.paymentStatus = PaymentStatus.PAID
  }

  const result = await prisma.order.update({
    where: { id },
    data: updateData,
    include: { buyer: true },
  })

  // 4. Real-time notification for buyer
  await sendNotification(
    {
      authId: sellerId,
      name: (result as any).seller?.name || 'Seller',
    },
    order.buyerId,
    'Order Status Updated',
    `Your order status has been updated to ${status}`,
    undefined,
    { status } // Pass status in metadata for the queue job
  )

  return result
}

export const OrderServices = {
  createOrder,
  getMyOrders,
  getSingleOrder,
  updateOrderStatus,
}
