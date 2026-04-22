import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IContact, IFaq } from './public.interface'
import prisma from '../../../shared/prisma'
import { Prisma, PublicContentType, UserRole } from '@prisma/client'
import { emailHelper } from '../../../helpers/emailHelper'
import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'

const createPublic = async (payload: { type: string; content: string }) => {
  const typeMap: Record<string, PublicContentType> = {
    'privacy-policy': PublicContentType.PRIVACY_POLICY,
    'terms-and-condition': PublicContentType.TERMS_AND_CONDITION,
    'contact': PublicContentType.CONTACT,
    'about': PublicContentType.ABOUT,
  }

  const prismaType = typeMap[payload.type] || (payload.type as PublicContentType)

  await prisma.publicContent.upsert({
    where: { type: prismaType },
    update: { content: payload.content },
    create: { type: prismaType, content: payload.content },
  })

  return `${payload.type} created successfully`
}

const getAllPublics = async (type: string) => {
  const typeMap: Record<string, PublicContentType> = {
    'privacy-policy': PublicContentType.PRIVACY_POLICY,
    'terms-and-condition': PublicContentType.TERMS_AND_CONDITION,
    'contact': PublicContentType.CONTACT,
    'about': PublicContentType.ABOUT,
  }

  const prismaType = typeMap[type] || (type as PublicContentType)

  const result = await prisma.publicContent.findUnique({
    where: { type: prismaType },
  })

  return result || null
}

const deletePublic = async (id: string) => {
  const result = await prisma.publicContent.delete({
    where: { id },
  })
  return result
}

const createContact = async (payload: IContact) => {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    })

    if (!admin || !admin.email) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Admin not found')
    }

    const emailData = {
      to: admin.email,
      subject: 'New Contact Form Submission',
      html: `
        <h1>New Contact Form Submission</h1>
        <p>You have received a new message from the contact form:</p>
        <ul>
          <li><strong>Name:</strong> ${payload.name}</li>
          <li><strong>Email:</strong> ${payload.email}</li>
          <li><strong>Phone:</strong> ${payload.phone}</li>
          <li><strong>Country:</strong> ${payload.country}</li>
        </ul>
        <h2>Message:</h2>
        <p>${payload.message}</p>
      `,
    }

    emailHelper.sendEmail(emailData)

    return { message: 'Contact form submitted successfully' }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to submit contact')
  }
}

const createFaq = async (payload: IFaq) => {
  const result = await prisma.faq.create({
    data: {
      question: payload.question,
      answer: payload.answer,
    },
  })
  return result
}

const getAllFaqs = async () => {
  return await prisma.faq.findMany()
}

const getSingleFaq = async (id: string) => {
  return await prisma.faq.findUnique({ where: { id } })
}

const updateFaq = async (id: string, payload: Partial<IFaq>) => {
  return await prisma.faq.update({
    where: { id },
    data: payload as any,
  })
}

const deleteFaq = async (id: string) => {
  return await prisma.faq.delete({
    where: { id },
  })
}


const getFeaturedKitchens = async () => {
  const result = await prisma.user.findMany({
    where: {
      role: UserRole.SELLER,
      metrics: {
        isNot: null,
      },
    },
    include: {
      metrics: true,
      categories: true,
      dishes: {
        take: 3,
        select: {
          id: true,
          name: true,
          images: true,
          price: true,
        },
      },
    },
    orderBy: [
      {
        metrics: {
          rating: 'desc',
        },
      },
      {
        metrics: {
          totalReview: 'desc',
        },
      },
    ],
    take: 6,
  })

  return result
}

const getAllKitchens = async (
  filters: { searchTerm?: string; city?: string; categoryId?: string },
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  const { searchTerm, city, categoryId } = filters

  const andConditions: Prisma.UserWhereInput[] = [
    {
      role: UserRole.SELLER,
    },
  ]

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    })
  }

  if (city) {
    andConditions.push({
      address: {
        city: {
          contains: city,
          mode: 'insensitive',
        },
      },
    })
  }

  if (categoryId) {
    andConditions.push({
      categories: {
        some: {
          id: categoryId,
        },
      },
    })
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {}

  const [result, total] = await Promise.all([
    prisma.user.findMany({
      where: whereConditions,
      include: {
        metrics: true,
        address: true,
        categories: true,
        dishes: {
          take: 3,
          select: {
            id: true,
            name: true,
            images: true,
            price: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.user.count({
      where: whereConditions,
    }),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

export const PublicServices = {
  createPublic,
  getAllPublics,
  deletePublic,
  createContact,
  createFaq,
  getAllFaqs,
  getSingleFaq,
  updateFaq,
  deleteFaq,
  getFeaturedKitchens,
  getAllKitchens,
}
