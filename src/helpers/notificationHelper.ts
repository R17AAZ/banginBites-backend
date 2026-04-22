import prisma from '../shared/prisma'
import { logger, errorLogger } from '../shared/logger'
import { emitToUser } from './socketInstances'
import { sendPushNotification } from './pushnotificationHelper'
import { Queue, Worker } from 'bullmq'
import { redisClient } from '../config/redis'

type NotificationSender = {
  authId: string
  profile?: string
  name?: string
}

type INotificationJob = {
  from: NotificationSender
  to: string
  title: string
  body: string
  fcmToken?: string
}

// ─── BullMQ Notification Queue ──────────────────────────────────────────────
const NOTIFICATION_QUEUE_NAME = 'notification-delivery'

export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 300 },
  },
})

// ─── BullMQ Worker ────────────────────────────────────────────────────────────
export const notificationWorker = new Worker(
  NOTIFICATION_QUEUE_NAME,
  async job => {
    const { from, to, title, body, fcmToken } = job.data as INotificationJob

    try {
      // 1. Persist notification to DB (if not already handled or needed for log)
      const result = await prisma.notification.create({
        data: {
          fromId: from.authId,
          toId: to,
          title,
          body,
          isRead: false,
        },
      })

      if (!result) {
        logger.warn('Notification DB write returned no result')
        return
      }

      // 2. Real-time delivery via Socket
      const socketPayload = {
        id: result.id,
        from: {
          id: from.authId,
          name: from.name,
          profile: from.profile,
        },
        to,
        title,
        body,
        isRead: false,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }

      emitToUser(to, 'notification', socketPayload)

      // 3. Push notifications (Multi-device support)
      const tokensToSend = fcmToken
        ? [fcmToken]
        : (await prisma.userDevice.findMany({
          where: { userId: to },
          select: { fcmToken: true }
        })).map(d => d.fcmToken)

      if (tokensToSend.length > 0) {
        await Promise.all(
          tokensToSend.map(token =>
            sendPushNotification(token, title, body, {
              from: from.authId,
              to,
            })
          )
        )
      }

      logger.info(`🔔 Notification delivered to: ${to} (job ${job.id})`)
    } catch (err: any) {
      errorLogger.error(`Notification job ${job.id} failed:`, err.message)
      throw err // Throw to trigger BullMQ retry
    }
  },
  {
    connection: redisClient,
    concurrency: 10, // Process up to 10 notifications in parallel
  },
)

notificationWorker.on('failed', (job, err) => {
  errorLogger.error(
    `Notification job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
    err.message,
  )
})

/**
 * Enqueues a notification for resilient, asynchronous delivery via BullMQ.
 * Retries 3x with exponential backoff on failures.
 */
export const sendNotification = async (
  from: NotificationSender, to: string, title: string, body: string, fcmToken?: string, p0?: unknown,
): Promise<void> => {
  try {
    await notificationQueue.add('deliver', { from, to, title, body, fcmToken })
  } catch (err) {
    errorLogger.error('Failed to enqueue notification:', err)
  }
}
