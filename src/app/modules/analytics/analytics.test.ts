import request from 'supertest'
import app from '../../../app'
import { StatusCodes } from 'http-status-codes'
import prisma from '../../../shared/prisma'
import { AuthHelper } from '../auth/auth.helper'
import { UserRole, OrderStatus, PaymentStatus } from '@prisma/client'

describe('Analytics Module Integration Tests', () => {
  let sellerToken: string
  let adminToken: string
  let sellerId: string

  beforeEach(async () => {
    // 1. Setup Seller
    const seller = await prisma.user.create({
      data: {
        email: `seller_${Math.random()}@example.com`,
        name: 'Stats Seller',
        role: UserRole.SELLER,
        verified: true,
        account: { create: { password: 'hashedpassword' } }
      }
    })
    sellerId = seller.id
    sellerToken = AuthHelper.createTokenPair(seller.id, seller.role).accessToken

    // 2. Setup Admin
    const admin = await prisma.user.create({
      data: {
        email: `admin_${Math.random()}@example.com`,
        name: 'Stats Admin',
        role: UserRole.ADMIN,
        verified: true,
        account: { create: { password: 'hashedpassword' } }
      }
    })
    adminToken = AuthHelper.createTokenPair(admin.id, admin.role).accessToken

    // 3. Create a paid order for stats
    const buyer = await prisma.user.create({
      data: { 
        email: `buyer_${Math.random()}@example.com`, 
        name: 'Buyer', 
        role: UserRole.BUYER,
        account: { create: { password: 'hashedpassword' } }
      }
    })

    await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        totalAmount: 100,
        platformFee: 8,
        sellerAmount: 92,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      }
    })
  })

  describe('GET /api/v1/analytics/seller', () => {
    it('should return correct earnings and totals for seller', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/seller')
        .set('Authorization', `Bearer ${sellerToken}`)

      expect(response.status).toBe(StatusCodes.OK)
      expect(response.body.data.earnings).toHaveProperty('total', 92)
      expect(response.body.data.earnings).toHaveProperty('totalOrders', 1)
    })

    it('should forbid regular users from accessing seller stats', async () => {
       // Using a guest or random user would fail
       const response = await request(app).get('/api/v1/analytics/seller')
       expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /api/v1/analytics/admin', () => {
    it('should return global platform totals for admin', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(StatusCodes.OK)
      expect(response.body.data.platform).toHaveProperty('totalGMV', 100)
      expect(response.body.data.platform).toHaveProperty('totalFeesCollected', 8)
    })

    it('should forbid SELLER from accessing ADMIN stats', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${sellerToken}`)

      expect(response.status).toBe(StatusCodes.FORBIDDEN)
    })
  })
})
