import { FetchClient } from '../core/FetchClient'

export class PaymentModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  async createPaymentIntent(payload: { orderId: string }): Promise<{ clientSecret: string; transactionId: string }> {
    return this.client.post('/payments/create-intent', payload)
  }
}
