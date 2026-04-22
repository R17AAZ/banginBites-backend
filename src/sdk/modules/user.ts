import { FetchClient } from '../core/FetchClient'
import { User, ApiResponse } from '../types'

export class UserModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  async getProfile(): Promise<User> {
    return this.client.get<User>('/user/my-profile')
  }

  async updateProfile(payload: Partial<User>): Promise<User> {
    return this.client.patch<User>('/user/update-my-profile', payload)
  }

  async updatePassword(payload: any): Promise<{ message: string }> {
    return this.client.patch('/user/update-my-password', payload)
  }

  async getAllUsers(params?: Record<string, any>): Promise<ApiResponse<User[]>> {
    const query = new URLSearchParams(params || {}).toString()
    const url = query ? `/user?${query}` : '/user'
    return this.client.requestFull<User[]>(url)
  }

  async getSellerProfile(id: string): Promise<any> {
    return this.client.get(`/user/seller/${id}`)
  }
}
