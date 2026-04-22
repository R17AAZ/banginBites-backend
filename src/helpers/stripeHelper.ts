import Stripe from 'stripe'
import config from '../config'

const stripe = new Stripe(config.stripe_secret as string, {
  apiVersion: '2026-03-25.dahlia', // Use latest or compatible version
})

const createPaymentIntent = async (amount: number, currency: string = 'usd', metadata: any = {}) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe expects amount in cents
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  })

  return paymentIntent
}

const createCheckoutSession = async (
  amount: number,
  currency: string = 'usd',
  metadata: any = {},
  successUrl: string,
  cancelUrl: string,
  customerEmail?: string,
) => {
  const session = await stripe.checkout.sessions.create({
    customer_email: customerEmail,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: 'Bangin Bites Order',
            description: `Order ID: ${metadata.orderId}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata,
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return session
}

export const StripeHelper = {
  createPaymentIntent,
  createCheckoutSession,
  stripe,
}
