import { FetchClient } from '../core/FetchClient'
import { Review, ApiResponse } from '../types'

export class ReviewModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  async createReview(payload: {
    revieweeId: string
    dishId?: string
    rating: number
    review: string
  }): Promise<Review> {
    return this.client.post<Review>('/reviews', payload)
  }

  async getReviewsByTarget(targetType: 'SELLER' | 'DISH', targetId: string): Promise<Review[]> {
    return this.client.get<Review[]>(`/reviews/target/${targetType}/${targetId}`)
  }

  async getAllReviews(type: 'RECEIVED' | 'GIVEN', params?: Record<string, any>): Promise<ApiResponse<Review[]>> {
    const query = new URLSearchParams(params || {}).toString()
    const url = query ? `/reviews/${type}?${query}` : `/reviews/${type}`
    return this.client.requestFull<Review[]>(url)
  }

  async replyToReview(id: string, payload: { replyMessage: string }): Promise<Review> {
    return this.client.patch<Review>(`/reviews/${id}/reply`, payload)
  }

  async hideReview(id: string, payload: { isHidden: boolean }): Promise<Review> {
    return this.client.patch<Review>(`/reviews/${id}/hide`, payload)
  }

  async updateReview(id: string, payload: { rating?: number; review?: string }): Promise<Review> {
    return this.client.patch<Review>(`/reviews/${id}`, payload)
  }

  async deleteReview(id: string): Promise<{ message: string }> {
    return this.client.delete(`/reviews/${id}`)
  }
}
