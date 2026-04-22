import prisma from '../shared/prisma'
import { logger } from '../shared/logger'
import { connectRedis, redisClient } from '../config/redis'

// Truncate all tables to ensure test isolation
const clearDatabase = async () => {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ')

  if (tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`)
    } catch (error) {
      logger.error('Error clearing database:', error)
    }
  }
}

beforeAll(async () => {
  await prisma.$connect()
  await connectRedis()
})

beforeEach(async () => {
  await clearDatabase()
})

afterAll(async () => {
  await prisma.$disconnect()
  await redisClient.quit()
})
