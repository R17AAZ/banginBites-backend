import { FetchClient } from '../core/FetchClient'

export class AnalyticsModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  // --- Dashboards ---
  async getSellerStats(): Promise<any> {
    return this.client.get('/analytics/seller')
  }

  async getAdminStats(): Promise<any> {
    return this.client.get('/analytics/admin')
  }

}
