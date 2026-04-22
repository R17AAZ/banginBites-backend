import { FetchClient } from '../core/FetchClient'
import { Category, Dish, Order, ApiResponse } from '../types'

export class MarketplaceModule {
  private client: FetchClient

  constructor(client: FetchClient) {
    this.client = client
  }

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    return this.client.get<Category[]>('/categories')
  }

  async getSingleCategory(id: string): Promise<Category> {
    return this.client.get<Category>(`/categories/${id}`)
  }

  async createCategory(payload: any): Promise<Category> {
    return this.client.post<Category>('/categories', payload)
  }

  async updateCategory(id: string, payload: any): Promise<Category> {
    return this.client.patch<Category>(`/categories/${id}`, payload)
  }

  async deleteCategory(id: string): Promise<{ message: string }> {
    return this.client.delete(`/categories/${id}`)
  }

  // --- Dishes ---
  async getDishes(params?: Record<string, any>): Promise<ApiResponse<Dish[]>> {
    const query = new URLSearchParams(params || {}).toString()
    const url = query ? `/dishes?${query}` : '/dishes'
    return this.client.requestFull<Dish[]>(url)
  }

  async getSingleDish(id: string): Promise<Dish> {
    return this.client.get<Dish>(`/dishes/${id}`)
  }

  async createDish(payload: any): Promise<Dish> {
    return this.client.post<Dish>('/dishes', payload)
  }

  async updateDish(id: string, payload: any): Promise<Dish> {
    return this.client.patch<Dish>(`/dishes/${id}`, payload)
  }

  async deleteDish(id: string): Promise<{ message: string }> {
    return this.client.delete(`/dishes/${id}`)
  }

  // --- Orders ---
  async createOrder(payload: any): Promise<Order> {
    return this.client.post<Order>('/orders', payload)
  }

  async getMyOrders(params?: { filterType?: 'HISTORY' | 'RUNNING' } & Record<string, any>): Promise<ApiResponse<Order[]>> {
    const query = new URLSearchParams(params as any || {}).toString()
    const url = query ? `/orders/my-orders?${query}` : '/orders/my-orders'
    return this.client.requestFull<Order[]>(url)
  }

  async getSingleOrder(id: string): Promise<Order> {
    return this.client.get<Order>(`/orders/${id}`)
  }

  async updateOrderStatus(id: string, payload: { status: string }): Promise<Order> {
    return this.client.patch<Order>(`/orders/${id}/status`, payload)
  }
}
