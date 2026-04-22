import request from 'supertest'
import app from '../../../app'
import { StatusCodes } from 'http-status-codes'
import prisma from '../../../shared/prisma'

describe('Auth Module Integration Tests', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    role: 'USER',
  }

  describe('POST /api/v1/auth/signup', () => {
    it('should successfully create a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(testUser)

      if (response.status !== StatusCodes.CREATED) {
        console.error('Signup Failure Body:', response.body)
      }

      expect(response.status).toBe(StatusCodes.CREATED)
      expect(response.body.success).toBe(true)
      
      const userInDb = await prisma.user.findUnique({
        where: { email: testUser.email.toLowerCase() }
      })
      expect(userInDb).toBeDefined()
    })

    it('should fail to signup with existing email', async () => {
      // First signup
      await request(app).post('/api/v1/auth/signup').send(testUser)
      
      // Second signup
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(testUser)

      expect(response.status).toBe(StatusCodes.CONFLICT)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Signup user first
      const signupRes = await request(app).post('/api/v1/auth/signup').send(testUser)
      if (signupRes.status !== StatusCodes.CREATED) {
        console.error('Setup Signup Failure:', signupRes.body)
      }

      // Manually verify user since signup creates it in UNVERIFIED state usually
      await prisma.user.update({
        where: { email: testUser.email.toLowerCase() },
        data: { verified: true }
      })
    })

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })

      if (response.status !== StatusCodes.OK) {
        console.error('Login Failure Body:', response.body)
      }

      expect(response.status).toBe(StatusCodes.OK)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('accessToken')
    })

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword'
        })

      expect(response.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })
})
