export type IPaymentIntentPayload = {
  orderId: string
}

export type IStripeWebhookPayload = {
  id: string
  type: string
  data: {
    object: any
  }
}
