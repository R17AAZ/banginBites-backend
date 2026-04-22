import Stripe from 'stripe'
import type { Stripe as StripeTypes } from 'stripe'
import config from '../../../config'
import prisma from '../../../shared/prisma'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OrderStatus, PaymentStatus, NotificationType } from '@prisma/client'


const stripe = new Stripe(config.stripe_secret as string, {
  apiVersion: '2025-01-27' as any,
})

const createPaymentIntent = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyer: true },
  })

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Order already paid')
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalAmount * 100), // Stripe expects cents
    currency: 'usd',
    metadata: { orderId: order.id },
    receipt_email: order.buyer.email,
  })

  // Update order with transaction ID (optional, we can do it in webhook too)
  await prisma.order.update({
    where: { id: orderId },
    data: {
      payment: {
        upsert: {
          create: {
            transactionId: intent.id,
            amount: order.totalAmount,
            method: order.paymentMethod,
            status: PaymentStatus.PENDING,
          },
          update: {
            transactionId: intent.id,
          },
        },
      },
    },
  })

  return {
    clientSecret: intent.client_secret,
    transactionId: intent.id,
  }
}

const handleWebhook = async (payload: string, signature: string) => {
  let event

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.webhook_secret as string,
    )
  } catch (err: any) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Webhook Error: ${err.message}`)
  }

  const dataObject = event.data.object as any
  const orderId = dataObject.metadata?.orderId

  if (!orderId) {
    console.log(`[Webhook] No orderId found in metadata for event: ${event.type}`)
    return { received: true }
  }

  console.log(`[Webhook] Processing ${event.type} for Order: ${orderId}`)

  switch (event.type) {
    case 'checkout.session.completed':
    case 'payment_intent.succeeded':
      await prisma.$transaction(async tx => {
        const order = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
          },
        })

        await tx.payment.update({
          where: { orderId: orderId },
          data: { status: PaymentStatus.PAID },
        })

        // Notify Seller
        await tx.notification.create({
          data: {
            toId: order.sellerId,
            title: 'Payment Received',
            body: `Order ${order.id} has been paid and is now confirmed.`,
            type: NotificationType.ORDER_STATUS_UPDATED,
            metadata: { orderId: order.id },
          },
        })
      })
      break

    case 'checkout.session.expired':
    case 'payment_intent.payment_failed':
    case 'checkout.session.async_payment_failed':
      await prisma.$transaction(async tx => {
        const order = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            status: OrderStatus.CANCELLED,
          },
        })

        await tx.payment.update({
          where: { orderId: orderId },
          data: { status: PaymentStatus.FAILED },
        })

        // Notify Buyer
        await tx.notification.create({
          data: {
            toId: order.buyerId,
            title: 'Order Cancelled - Payment Failed',
            body: `Your order ${order.id} was cancelled because the payment failed or the session expired.`,
            type: NotificationType.ORDER_STATUS_UPDATED,
            metadata: { orderId: order.id, status: OrderStatus.CANCELLED },
          },
        })
      })
      break

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`)
  }

  return { received: true }
}

export const PaymentServices = {
  createPaymentIntent,
  handleWebhook,
}
