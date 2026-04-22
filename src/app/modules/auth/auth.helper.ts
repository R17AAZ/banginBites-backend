import { Secret } from 'jsonwebtoken'
import { jwtHelper } from '../../../helpers/jwtHelper'
import config from '../../../config'
import bcrypt from 'bcrypt'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import { AUTH_MESSAGES } from './auth.constants'
import prisma from '../../../shared/prisma'
import { IAuthResponse } from './auth.interface'

/**
 * Generates regular Access and Refresh token pair
 */
const createTokenPair = (
  authId: string,
  role: string,
  name?: string | null,
  email?: string | null,
  profile?: string | null,
  fcmToken?: string | null,
) => {
  const accessToken = jwtHelper.createToken(
    { authId, role, name, email, profile, fcmToken },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  )
  const refreshToken = jwtHelper.createToken(
    { authId, role, name, email, fcmToken },
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in as string,
  )

  return { accessToken, refreshToken }
}

/**
 * Generates a short-lived temporary access token
 */
const createTempToken = (
  authId: string,
  role: string,
  name?: string | null,
  email?: string | null,
) => {
  const accessToken = jwtHelper.createToken(
    { authId, role, name, email },
    config.jwt.temp_jwt_secret as Secret,
    config.jwt.temp_jwt_expire_in as string,
  )

  return { accessToken }
}

const isPasswordMatched = async (
  plainTextPassword: string,
  hashedPassword: string,
) => {
  return await bcrypt.compare(plainTextPassword, hashedPassword)
}

const isTokenInvalidated = (
  passwordChangedAt: Date,
  tokenIssuedAt: number,
): boolean => {
  const passwordChangedTime = Math.floor(passwordChangedAt.getTime() / 1000)
  return passwordChangedTime > tokenIssuedAt
}

/**
 * Throws a TOO_MANY_REQUESTS error if the account is currently restricted.
 */
const assertNotLocked = (
  isRestricted?: boolean,
  restrictionLeftAt?: Date | null,
): void => {
  if (isRestricted && restrictionLeftAt && new Date() < restrictionLeftAt) {
    const remaining = Math.ceil(
      (restrictionLeftAt.getTime() - Date.now()) / 60000,
    )
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      AUTH_MESSAGES.ACCOUNT_LOCKED(remaining),
    )
  }
}

/**
 * Increments failed attempt count and locks account if threshold reached.
 */
const handleFailedPasswordAttempt = async (
  userId: string,
  currentAttempts: number,
): Promise<void> => {
  const attempts = currentAttempts + 1
  const shouldLock = attempts >= Number(config.max_wrong_attempts)

  const data: any = {
    wrongLoginAttempts: { increment: 1 },
    isRestricted: shouldLock,
  }

  if (shouldLock) {
    const lockUntil = new Date(
      Date.now() + Number(config.restriction_minutes) * 60 * 1000,
    )
    data.restrictionLeftAt = lockUntil
  }

  await prisma.userAccount.update({
    where: { userId },
    data,
  })
}

const resetSecurityCounters = async (
  userId: string,
  fcmToken?: string | null,
): Promise<void> => {
  await prisma.$transaction(async tx => {
    // 1. Reset security flags in UserAccount
    await tx.userAccount.update({
      where: { userId },
      data: {
        wrongLoginAttempts: 0,
        isRestricted: false,
        restrictionLeftAt: null,
      },
    })

    // 2. Manage FCM Token in UserDevice (upsert)
    if (fcmToken) {
      await tx.userDevice.upsert({
        where: { fcmToken },
        create: {
          userId,
          fcmToken,
        },
        update: {
          userId,
        },
      })
    }
  })
}

const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim()
}

const buildAuthResponse = (
  status: number,
  message: string,
  options: {
    role?: string
    accessToken?: string
    refreshToken?: string
    token?: string
  } = {},
): IAuthResponse => {
  return {
    status,
    message,
    ...options,
  }
}

export const AuthHelper = {
  createTokenPair,
  createTempToken,
  isPasswordMatched,
  isTokenInvalidated,
  assertNotLocked,
  handleFailedPasswordAttempt,
  resetSecurityCounters,
  sanitizeEmail,
  buildAuthResponse,
}
