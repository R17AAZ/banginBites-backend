/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import config from '../../config'
import { IGenericErrorMessage } from '../../interfaces/error'
import ApiError from '../../errors/ApiError'
import { errorLogger } from '../../shared/logger'
import { ZodError } from 'zod'
import handleZodError from '../../errors/handleZodError'
import { Prisma } from '@prisma/client'
import handlePrismaError from '../../errors/handlePrismaError'
import handlePrismaValidationError from '../../errors/handlePrismaValidationError'

const globalErrorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Always log the error server-side
  if (config.node_env === 'development') {
    errorLogger.error('Global Error Handler:', error)
  }

  let statusCode = 500
  let message = 'Something went wrong!'
  let errorMessages: IGenericErrorMessage[] = []

  // ── Prisma Known Request Error (e.g. Unique constraints) ──────────────────
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaError(error)
    statusCode = simplifiedError.statusCode
    message = simplifiedError.message
    errorMessages = simplifiedError.errorMessages

  // ── Prisma Validation Error ────────────────────────────────────────────────
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    const simplifiedError = handlePrismaValidationError(error)
    statusCode = simplifiedError.statusCode
    message = simplifiedError.message
    errorMessages = simplifiedError.errorMessages

  // ── Zod Validation Error ────────────────────────────────────────────────────
  } else if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error)
    statusCode = simplifiedError.statusCode
    message = simplifiedError.errorMessages[0]?.message ?? message
    errorMessages = simplifiedError.errorMessages

  // ── Application-level API Error ─────────────────────────────────────────────
  } else if (error instanceof ApiError) {
    statusCode = error.statusCode
    message = error.message
    errorMessages = error.message ? [{ path: '', message: error.message }] : []

  // ── Generic JavaScript Error ────────────────────────────────────────────────
  } else if (error instanceof Error) {
    message = error.message
    errorMessages = error.message ? [{ path: '', message: error.message }] : []
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    // Stack trace only in non-production (already logged server-side above)
    stack: config.node_env === 'production' ? undefined : error?.stack,
  })
}

export default globalErrorHandler
