import { FetchClient } from '../core/FetchClient'
import { User, AuthTokens } from '../types'

export class AuthModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  async signup(payload: any): Promise<{ user: User }> {
    return this.client.post<{ user: User }>('/auth/signup', payload)
  }

  async login(payload: any): Promise<{ user: User } & AuthTokens> {
    const data = await this.client.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', payload)
    
    // Automatically store tokens if a storage provider is available
    if (this.client.storage) {
      if (data.accessToken) await this.client.storage.setItem('accessToken', data.accessToken)
      if (data.refreshToken) await this.client.storage.setItem('refreshToken', data.refreshToken)
    }

    return data
  }

  async verifyAccount(payload: { email: string; oneTimeCode: string; type: string }): Promise<void> {
    return this.client.post('/auth/verify-account', payload)
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const data = await this.client.post<AuthTokens>('/auth/refresh-token', { refreshToken })
    if (this.client.storage && data.accessToken) {
      await this.client.storage.setItem('accessToken', data.accessToken)
    }
    return data
  }

  async logout(): Promise<void> {
    if (this.client.storage) {
      await this.client.storage.removeItem('accessToken')
      await this.client.storage.removeItem('refreshToken')
    }
  }

  async forgetPassword(payload: { email: string }): Promise<{ message: string }> {
    return this.client.post('/auth/forget-password', payload)
  }

  async resetPassword(payload: { email: string; token: string; newPassword: string }): Promise<{ message: string }> {
    return this.client.post('/auth/reset-password', payload)
  }
}
