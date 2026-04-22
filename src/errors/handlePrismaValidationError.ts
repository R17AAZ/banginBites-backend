import { Prisma } from '@prisma/client'
import { IGenericErrorResponse } from '../interfaces/error'

const handlePrismaValidationError = (
  error: Prisma.PrismaClientValidationError,
): IGenericErrorResponse => {
  const statusCode = 400
  const message = 'Validation Error'
  const errorMessages = [
    {
      path: '',
      message: error.message,
    },
  ]

  return {
    statusCode,
    message,
    errorMessages,
  }
}

export default handlePrismaValidationError
