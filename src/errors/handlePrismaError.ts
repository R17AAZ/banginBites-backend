import { Prisma } from '@prisma/client'
import { IGenericErrorResponse } from '../interfaces/error'
import { IGenericErrorMessage } from '../interfaces/error'

const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError,
): IGenericErrorResponse => {
  let statusCode = 400
  let message = 'Database Error'
  let errorMessages: IGenericErrorMessage[] = []

  if (error.code === 'P2002') {
    statusCode = 409
    const target = (error.meta?.target as string[]) || ['field']
    message = `Duplicate entry found for ${target.join(', ')}`
    errorMessages = target.map(field => ({
      path: field,
      message: `${field} already exists.`,
    }))
  } else if (error.code === 'P2025') {
    statusCode = 404
    message = (error.meta?.cause as string) || 'Record not found'
    errorMessages = [
      {
        path: '',
        message,
      },
    ]
  } else if (error.code === 'P2003') {
    if (error.message.includes('delete')) {
      statusCode = 400
      message = 'Cannot delete record due to existing relations.'
    }
  }

  return {
    statusCode,
    message,
    errorMessages,
  }
}

export default handlePrismaError
