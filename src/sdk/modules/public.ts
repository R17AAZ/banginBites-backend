import { FetchClient } from '../core/FetchClient'

export class PublicModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  async getFaqs(): Promise<any[]> {
    return this.client.get('/public/faqs')
  }

  async getContent(type: string): Promise<any> {
    return this.client.get(`/public/content/${type}`)
  }
}
