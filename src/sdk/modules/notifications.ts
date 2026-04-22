import { FetchClient } from '../core/FetchClient'
import { Notification, ApiResponse } from '../types'

export class NotificationsModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  async getMyNotifications(params?: Record<string, any>): Promise<ApiResponse<Notification[]>> {
    const query = new URLSearchParams(params || {}).toString()
    const url = query ? `/notifications?${query}` : '/notifications'
    return this.client.requestFull<Notification[]>(url)
  }

  /**
   * Mark a single notification as read.
   * Note: Backend currently uses GET for this operational update.
   */
  async markAsRead(id: string): Promise<{ message: string }> {
    return this.client.get(`/notifications/${id}`)
  }

  /**
   * Mark all notifications as read.
   * Note: Backend currently uses GET for this operational update.
   */
  async markAllAsRead(): Promise<{ message: string }> {
    return this.client.get('/notifications/all')
  }
}
