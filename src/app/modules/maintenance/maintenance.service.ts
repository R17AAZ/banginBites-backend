import { UserStatus } from '@prisma/client'
import prisma from '../../../shared/prisma'
import { redisClient } from '../../../config/redis'
import { logger } from '../../../shared/logger'

/**
 * Permanently removes users who have been soft-deleted for longer than the threshold.
 */
const purgeOldDeletedUsers = async (daysThreshold: number = 30) => {
  const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000)

  const result = await prisma.user.deleteMany({
    where: {
      status: UserStatus.DELETED,
      updatedAt: { lt: cutoffDate },
    },
  })

  logger.info(`♻️  Maintenance: Purged ${result.count} old deleted user records.`)
  return result.count
}

/**
 * Iteratively deletes all Redis keys matching the auth cache pattern.
 */
const clearAuthCache = async () => {
  const pattern = 'auth:v1:user:*'
  let cursor = '0'
  let deletedTotal = 0

  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = nextCursor

    if (keys.length > 0) {
      await redisClient.del(...keys)
      deletedTotal += keys.length
    }
  } while (cursor !== '0')

  logger.info(`♻️  Maintenance: Cleared ${deletedTotal} auth cache entries from Redis.`)
  return deletedTotal
}

/**
 * Retrieves a summary of system storage and entity counts.
 */
const getStorageStats = async () => {
  const [totalUsers, deletedUsers, pendingVerifications, redisInfo] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: UserStatus.DELETED } }),
    prisma.verification.count(),
    redisClient.info('memory'),
  ])

  // Parse used memory from Redis info string
  const usedMemoryMatch = redisInfo.match(/used_memory_human:([\d\w.]+)/)
  const usedMemory = usedMemoryMatch ? usedMemoryMatch[1] : 'unknown'

  return {
    users: {
      total: totalUsers,
      active: totalUsers - deletedUsers,
      softDeleted: deletedUsers,
    },
    verification: {
      pendingOtpSessions: pendingVerifications,
    },
    redis: {
      usedMemoryHuman: usedMemory,
    },
  }
}

export const MaintenanceService = {
  purgeOldDeletedUsers,
  clearAuthCache,
  getStorageStats,
}
