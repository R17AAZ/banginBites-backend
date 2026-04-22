import { NextFunction, Request, Response } from 'express'
import { Secret } from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'
import config from '../../config'
import { jwtHelper } from '../../helpers/jwtHelper'
import ApiError from '../../errors/ApiError'
import { UserStatus } from '@prisma/client'
import prisma from '../../shared/prisma'
import { AuthCache } from '../modules/auth/auth.cache'
import { AuthHelper } from '../modules/auth/auth.helper'

const makeAuth =
  (secret: Secret) =>
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenWithBearer = req.headers.authorization

      if (!tokenWithBearer) {
        if (roles.includes('GUEST')) {
          req.user = { role: 'GUEST' }
          return next()
        }

        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Authentication required. Please provide a valid token.',
        )
      }

      if (!tokenWithBearer.startsWith('Bearer ')) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Malformed authorization header. Expected format: Bearer <token>',
        )
      }

      const token = tokenWithBearer.split(' ')[1]

      try {
        const verifyUser = jwtHelper.verifyToken(token, secret)
        const { authId, iat } = verifyUser

        // 1. Check Redis Cache First
        let securityData = await AuthCache.getAuthCache(authId)

        // 2. Fallback to DB if cache miss
        if (!securityData) {
          const user = await prisma.user.findUnique({
            where: { id: authId },
            include: { account: true }
          })
          if (!user || !user.account) {
            throw new ApiError(
              StatusCodes.UNAUTHORIZED,
              'Account no longer exists.',
            )
          }

          securityData = {
            status: user.status as any,
            passwordChangedAt: user.account.passwordChangedAt?.toISOString() || null,
          }
          await AuthCache.setAuthCache(authId, securityData)
        }

        // 3. Status Invalidation
        if (securityData.status === UserStatus.DELETED) {
          throw new ApiError(
            StatusCodes.FORBIDDEN,
            'This account has been deleted.',
          )
        }
        if (securityData.status === UserStatus.RESTRICTED) {
          throw new ApiError(
            StatusCodes.FORBIDDEN,
            'Your access has been restricted.',
          )
        }

        // 4. Password Change Invalidation
        if (securityData.passwordChangedAt && iat) {
          const changedAt = new Date(securityData.passwordChangedAt)
          if (AuthHelper.isTokenInvalidated(changedAt, iat)) {
            throw new ApiError(
              StatusCodes.UNAUTHORIZED,
              'Session expired due to password change. Please login again.',
            )
          }
        }

        req.user = verifyUser

        if (roles.length && !roles.includes(verifyUser.role)) {
          throw new ApiError(
            StatusCodes.FORBIDDEN,
            "You don't have permission to access this resource.",
          )
        }

        next()
      } catch (error) {
        if (error instanceof ApiError) throw error

        if (error instanceof Error) {
          if (error.name === 'TokenExpiredError') {
            throw new ApiError(
              StatusCodes.UNAUTHORIZED,
              'Access token has expired. Please refresh your session.',
            )
          }
          if (error.name === 'JsonWebTokenError') {
            throw new ApiError(
              StatusCodes.UNAUTHORIZED,
              'Invalid access token.',
            )
          }
        }

        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Token verification failed.',
        )
      }
    } catch (error) {
      next(error)
    }
  }

const auth = makeAuth(config.jwt.jwt_secret as Secret)
export default auth

export const tempAuth = makeAuth(config.jwt.temp_jwt_secret as Secret)
