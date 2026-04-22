import request from 'supertest'
import app from '../../../app'
import { StatusCodes } from 'http-status-codes'
import prisma from '../../../shared/prisma'
import { AuthHelper } from '../auth/auth.helper'
import { USER_ROLES } from '../../../enum/user'

describe('Category Module Integration Tests', () => {
  let adminToken: string
  let userToken: string

  beforeEach(async () => {
    // Create an Admin and a User in the DB with required accounts for the middleware
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: USER_ROLES.ADMIN,
        verified: true,
        account: { create: { password: 'hashedpassword' } }
      }
    })
    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Regular User',
        role: USER_ROLES.BUYER,
        verified: true,
        account: { create: { password: 'hashedpassword' } }
      }
    })

    // Generate tokens manually using AuthHelper to speed up tests
    adminToken = AuthHelper.createTokenPair(admin.id, admin.role).accessToken
    userToken = AuthHelper.createTokenPair(user.id, user.role).accessToken
  })

  describe('POST /api/v1/categories', () => {
    const newCategory = {
      name: 'Desserts',
      description: 'Sweet treats'
    }

    it('should allow ADMIN to create a category', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCategory)

      expect(response.status).toBe(StatusCodes.OK)
      expect(response.body.data).toHaveProperty('name', 'Desserts')
    })

    it('should forbid USER from creating a category', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newCategory)

      expect(response.status).toBe(StatusCodes.FORBIDDEN)
    })

    it('should return 401 for UNAUTHORIZED guest', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .send(newCategory)

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /api/v1/categories', () => {
    it('should allow anyone to list categories', async () => {
      // Seed a category first
      await prisma.category.create({
        data: { name: 'Japanese', description: 'Sushi and more' }
      })

      const response = await request(app).get('/api/v1/categories')

      expect(response.status).toBe(StatusCodes.OK)
      expect(Array.isArray(response.body.data)).toBe(true)
    })
  })
})
