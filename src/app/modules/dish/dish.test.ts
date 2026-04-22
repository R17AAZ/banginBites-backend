import request from 'supertest'
import app from '../../../app'
import { StatusCodes } from 'http-status-codes'
import prisma from '../../../shared/prisma'
import { AuthHelper } from '../auth/auth.helper'
import { USER_ROLES } from '../../../enum/user'

describe('Dish Module Integration Tests', () => {
  let sellerToken: string
  let buyerToken: string
  let categoryId: string

  beforeEach(async () => {
    // Create Category first
    const category = await prisma.category.create({
      data: { name: 'Main Course ' + Math.random() }
    })
    categoryId = category.id

    // Create Seller and Buyer with required accounts for the middleware
    const seller = await prisma.user.create({
      data: {
        email: `seller_${Math.random()}@example.com`,
        name: 'Seller User',
        role: USER_ROLES.SELLER,
        verified: true,
        account: { create: { password: 'hashedpassword' } }
      }
    })
    const buyer = await prisma.user.create({
      data: {
        email: `buyer_${Math.random()}@example.com`,
        name: 'Buyer User',
        role: USER_ROLES.BUYER,
        verified: true,
        account: { create: { password: 'hashedpassword' } }
      }
    })

    sellerToken = AuthHelper.createTokenPair(seller.id, seller.role).accessToken
    buyerToken = AuthHelper.createTokenPair(buyer.id, buyer.role).accessToken
  })

  describe('POST /api/v1/dishes', () => {
    const newDish = {
      name: 'Beef Steak',
      description: 'Juicy grilled beef',
      price: 25.99,
    }

    it('should allow SELLER to create a dish', async () => {
      const response = await request(app)
        .post('/api/v1/dishes')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ ...newDish, categoryId })

      expect(response.status).toBe(StatusCodes.OK)
      expect(response.body.data).toHaveProperty('name', 'Beef Steak')
    })

    it('should forbid BUYER from creating a dish', async () => {
      const response = await request(app)
        .post('/api/v1/dishes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ ...newDish, categoryId })

      expect(response.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  describe('GET /api/v1/dishes', () => {
    it('should list all available dishes', async () => {
      const response = await request(app).get('/api/v1/dishes')

      expect(response.status).toBe(StatusCodes.OK)
      expect(response.body.data.length).toBeDefined()
    })
  })
})
