import { StorageProvider } from './StorageProvider'
import { ApiError, ApiResponse } from '../types'

export interface FetchClientOptions {
  baseURL: string
  storage?: StorageProvider
  onUnauthorized?: () => void
}

export class FetchClient {
  private baseURL: string
  public storage?: StorageProvider
  private onUnauthorized?: () => void

  constructor(options: FetchClientOptions) {
    this.baseURL = options.baseURL
    this.storage = options.storage
    this.onUnauthorized = options.onUnauthorized
  }

  private async getAuthHeader(): Promise<HeadersInit> {
    if (!this.storage) return {}
    
    // We expect the consumer SDK functions to manage exactly what token to send.
    // For general API calls, the auth token is needed.
    const token = await this.storage.getItem('accessToken')
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }

  async requestFull<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...await this.getAuthHeader(),
      ...(options.headers || {})
    }

    try {
      const response = await fetch(url, { ...options, headers })
      const data: ApiResponse<T> = await response.json()

      if (!response.ok) {
        if (response.status === 401 && this.onUnauthorized) {
          this.onUnauthorized()
        }
        throw new ApiError(data.message || 'An error occurred', response.status, false)
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError((error as Error).message || 'Network error', 500, false)
    }
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await this.requestFull<T>(endpoint, options)
    return res.data
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}
