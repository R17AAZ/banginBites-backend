import { StatusCodes } from 'http-status-codes'
import { JwtPayload } from 'jsonwebtoken'
import prisma from '../../../shared/prisma'
import { VerificationService } from '../verification/verification.service'
import { AuthCache } from './auth.cache'
import { AuthHelper } from './auth.helper'
import { AUTH_MESSAGES } from './auth.constants'
import { IAuthResponse, IVerifyAccountPayload, ISocialLoginPayload } from './auth.interface'
import { ILoginData, IChangePassword, IAuthResetPassword } from '../../../interfaces/auth'
import { IUser } from '../user/user.interface'
import { UserRole, UserStatus, VerificationType } from '@prisma/client'
import { emailTemplate } from '../../../shared/emailTemplate'
import { emailHelper } from '../../../helpers/emailHelper'
import ApiError from '../../../errors/ApiError'
import cryptoToken from '../../../utils/crypto'
import { errorLogger } from '../../../shared/logger'
import { jwtHelper } from '../../../helpers/jwtHelper'
import config from '../../../config'
import bcrypt from 'bcrypt'

// ═══ REGISTRATION ══════════════════════════════════════════════════════════

const signup = async (payload: IUser) => {
  return await prisma.$transaction(async tx => {
    const sanitizedEmail = AuthHelper.sanitizeEmail(payload.email)
    const hashedPassword = await bcrypt.hash(payload.password!, Number(config.bcrypt_salt_rounds))

    // Create User with nested Account and Metrics
    const user = await tx.user.create({
      data: {
        email: sanitizedEmail,
        name: payload.name,
        profile: payload.profile,
        phone: payload.phone,
        role: payload.role || UserRole.USER,
        status: UserStatus.ACTIVE,
        verified: false,
        account: {
          create: {
            password: hashedPassword,
          },
        },
        metrics: {
          create: {}, // Initialize empty metrics
        },
        address: payload.address ? {
          create: {
            street: payload.address as any, // Legacy support for string address
          }
        } : undefined
      },
      include: {
        account: true
      }
    })

    if (!user) throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user account.')

    const { otp } = await VerificationService.createInitialVerification(
      sanitizedEmail,
      VerificationType.ACCOUNT_ACTIVATION,
      tx,
    )

    const signupEmail = emailTemplate.createAccount({
      name: payload.name!,
      email: sanitizedEmail,
      otp,
    })

    emailHelper.sendEmail(signupEmail)
    return AUTH_MESSAGES.SIGNUP_SUCCESS
  })
}

const socialLogin = async (payload: ISocialLoginPayload): Promise<IAuthResponse> => {
  const { appId, fcmToken } = payload
  let socialAccount = await prisma.socialAccount.findUnique({
    where: { providerId: appId },
    include: { user: true }
  })

  let user = socialAccount?.user

  if (!user) {
    user = await prisma.$transaction(async tx => {
      return await tx.user.create({
        data: {
          email: `social_${appId}@template.com`,
          verified: true,
          status: UserStatus.ACTIVE,
          socialAccounts: {
            create: {
              provider: 'GENERIC', // Or specify based on context
              providerId: appId,
            }
          },
          account: {
            create: {
              password: cryptoToken(),
            }
          },
          metrics: {
            create: {}
          }
        }
      })
    })
  }

  // Update FCM token
  if (!user) throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'User creation failed.')
  
  await AuthHelper.resetSecurityCounters(user.id, fcmToken)

  const tokens = AuthHelper.createTokenPair(user.id, user.role, user.name, user.email)

  return AuthHelper.buildAuthResponse(StatusCodes.OK, AUTH_MESSAGES.VERIFY_SUCCESS(user.name!), {
    role: user.role,
    ...tokens
  })
}

const handleGoogleLogin = async (payload: any): Promise<IAuthResponse> => {
  const { emails, photos, displayName, id } = payload.profile
  const email = AuthHelper.sanitizeEmail(emails[0].value)

  let socialAccount = await prisma.socialAccount.findUnique({
    where: { providerId: id },
    include: { user: true }
  })

  let user: any = socialAccount?.user

  if (!user) {
    // Check if user exists by email but hasn't linked Google
    user = await prisma.user.findFirst({
      where: {
        email,
        status: { in: [UserStatus.ACTIVE, UserStatus.RESTRICTED] },
      },
    })

    user = await prisma.$transaction(async tx => {
      if (!user) {
        return await tx.user.create({
          data: {
            email,
            profile: photos[0]?.value,
            name: displayName,
            verified: true,
            status: UserStatus.ACTIVE,
            role: payload.role as UserRole,
            socialAccounts: {
              create: {
                provider: 'GOOGLE',
                providerId: id,
              }
            },
            account: {
              create: {
                password: cryptoToken(),
              }
            },
            metrics: {
              create: {}
            }
          }
        })
      } else {
        // Link Google to existing user
        await tx.socialAccount.create({
          data: {
            userId: user.id,
            provider: 'GOOGLE',
            providerId: id,
          }
        })
        return user
      }
    })
  }

  const tokens = AuthHelper.createTokenPair(user!.id, user!.role, user!.name, user!.email)
  return AuthHelper.buildAuthResponse(StatusCodes.OK, AUTH_MESSAGES.LOGIN_SUCCESS(user!.name!), {
    role: user!.role,
    ...tokens
  })
}

// ═══ LOGIN ═════════════════════════════════════════════════════════════════

const login = async (payload: ILoginData, requireRole?: string): Promise<IAuthResponse> => {
  const email = AuthHelper.sanitizeEmail(payload.email)
  const user = await prisma.user.findUnique({
    where: { email },
    include: { account: true }
  })

  if (!user || !user.account) throw new ApiError(StatusCodes.BAD_REQUEST, AUTH_MESSAGES.INVALID_CREDENTIALS)
  if (user.status === UserStatus.DELETED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_DELETED)
  if (user.status === UserStatus.RESTRICTED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_RESTRICTED)
  if (requireRole && user.role !== requireRole) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ADMIN_ONLY_LOGIN)

  AuthHelper.assertNotLocked(user.account.isRestricted, user.account.restrictionLeftAt)

  const userPassword = user.account.password
  const isMatch = await AuthHelper.isPasswordMatched(payload.password, userPassword)
  if (!isMatch) {
    await AuthHelper.handleFailedPasswordAttempt(user.id, user.account.wrongLoginAttempts)
    throw new ApiError(StatusCodes.BAD_REQUEST, AUTH_MESSAGES.INVALID_CREDENTIALS)
  }

  if (!user.verified) {
    await VerificationService.validateOtpRequest(email, VerificationType.ACCOUNT_ACTIVATION)
    const { otp } = await VerificationService.upsertVerification(email, VerificationType.ACCOUNT_ACTIVATION)
    emailHelper.sendEmail(emailTemplate.createAccount({ email, name: user.name || '', otp }))
    throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.UNVERIFIED_ACCOUNT)
  }

  await AuthHelper.resetSecurityCounters(user.id, payload.fcmToken)
  const tokens = AuthHelper.createTokenPair(user.id, user.role, user.name, user.email)

  return AuthHelper.buildAuthResponse(StatusCodes.OK, AUTH_MESSAGES.LOGIN_SUCCESS(user.name!), {
    role: user.role,
    ...tokens
  })
}

const refreshToken = async (token: string) => {
  try {
    const decoded = jwtHelper.verifyToken(token, config.jwt.jwt_refresh_secret as string)
    const { authId, iat } = decoded

    const user = await prisma.user.findUnique({ 
      where: { id: authId },
      include: { account: true }
    })
    if (!user || !user.account) throw new ApiError(StatusCodes.NOT_FOUND, AUTH_MESSAGES.ACCOUNT_NOT_FOUND)
    
    if (user.status === UserStatus.DELETED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_DELETED)
    if (user.status === UserStatus.RESTRICTED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_RESTRICTED)

    if (user.account.passwordChangedAt && AuthHelper.isTokenInvalidated(user.account.passwordChangedAt, iat!)) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, AUTH_MESSAGES.SESSION_EXPIRED_PASSWORD)
    }

    const { accessToken } = AuthHelper.createTokenPair(user.id, user.role, user.name, user.email)
    return { accessToken }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, AUTH_MESSAGES.REFRESH_TOKEN_EXPIRED)
    }
    throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.INVALID_REFRESH_TOKEN)
  }
}

// ═══ VERIFICATION ══════════════════════════════════════════════════════════

const verifyAccount = async (payload: IVerifyAccountPayload): Promise<IAuthResponse> => {
  const email = AuthHelper.sanitizeEmail(payload.email)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.status === UserStatus.DELETED) throw new ApiError(StatusCodes.NOT_FOUND, AUTH_MESSAGES.ACCOUNT_NOT_FOUND)
  if (user.status === UserStatus.RESTRICTED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_RESTRICTED)

  return await prisma.$transaction(async tx => {
    const prismaVerificationType = payload.type.toUpperCase() as VerificationType
    await VerificationService.verifyOtp(email, prismaVerificationType, payload.oneTimeCode, tx)

    if (prismaVerificationType === VerificationType.ACCOUNT_ACTIVATION) {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { verified: true }
      })
      await VerificationService.deleteVerification(email, VerificationType.ACCOUNT_ACTIVATION, tx)
      const tokens = AuthHelper.createTokenPair(updatedUser.id, updatedUser.role, updatedUser.name, updatedUser.email)
      return AuthHelper.buildAuthResponse(StatusCodes.OK, AUTH_MESSAGES.VERIFY_SUCCESS(updatedUser.name!), {
        role: updatedUser.role,
        ...tokens
      })
    }

    if (prismaVerificationType === VerificationType.RESET_PASSWORD) {
      const resetToken = cryptoToken()
      await tx.token.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      })
      await VerificationService.deleteVerification(email, VerificationType.RESET_PASSWORD, tx)
      return AuthHelper.buildAuthResponse(StatusCodes.OK, AUTH_MESSAGES.OTP_VERIFIED_RESET, { token: resetToken })
    }

    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Unrecognized verification type.')
  })
}

const resendOtp = async (email: string, type: string) => {
  const sanitizedEmail = AuthHelper.sanitizeEmail(email)
  const user = await prisma.user.findUnique({ where: { email: sanitizedEmail } })
  if (!user || user.status === UserStatus.DELETED) throw new ApiError(StatusCodes.NOT_FOUND, AUTH_MESSAGES.ACCOUNT_NOT_FOUND)
  if (user.status === UserStatus.RESTRICTED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_RESTRICTED)

  const prismaType = type.toUpperCase() as VerificationType
  await VerificationService.validateOtpRequest(sanitizedEmail, prismaType)
  const { otp } = await VerificationService.upsertVerification(sanitizedEmail, prismaType)

  const emailData = emailTemplate.resendOtp({ email: sanitizedEmail, name: user.name || '', otp, type: type as any })
  emailHelper.sendEmail(emailData).catch(err => errorLogger.error('OTP resend failed:', err))

  return AUTH_MESSAGES.OTP_SENT
}

// ═══ PASSWORD MANAGEMENT ═══════════════════════════════════════════════════

const forgetPassword = async (email: string) => {
  const sanitizedEmail = AuthHelper.sanitizeEmail(email)
  const user = await prisma.user.findUnique({ 
    where: { email: sanitizedEmail },
    include: { account: true }
  })
  if (!user || user.status === UserStatus.DELETED || !user.account) throw new ApiError(StatusCodes.NOT_FOUND, AUTH_MESSAGES.ACCOUNT_NOT_FOUND)
  if (user.status === UserStatus.RESTRICTED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_RESTRICTED)

  AuthHelper.assertNotLocked(user.account.isRestricted, user.account.restrictionLeftAt)
  await VerificationService.validateOtpRequest(sanitizedEmail, VerificationType.RESET_PASSWORD)
  const { otp } = await VerificationService.upsertVerification(sanitizedEmail, VerificationType.RESET_PASSWORD)

  const resetEmail = emailTemplate.resetPassword({ name: user.name || '', email: sanitizedEmail, otp })
  emailHelper.sendEmail(resetEmail).catch(err => errorLogger.error('Reset email failed:', err))

  return AUTH_MESSAGES.OTP_SENT
}

const resetPassword = async (resetToken: string, payload: IAuthResetPassword) => {
  return await prisma.$transaction(async tx => {
    const isTokenExist = await tx.token.findFirst({ where: { token: resetToken } })
    if (!isTokenExist || new Date() > isTokenExist.expiresAt) {
      if (isTokenExist) await tx.token.delete({ where: { id: isTokenExist.id } })
      throw new ApiError(StatusCodes.BAD_REQUEST, AUTH_MESSAGES.SESSION_INVALID)
    }

    const user = await tx.user.findUnique({ where: { id: isTokenExist.userId } })
    if (!user || user.status === UserStatus.RESTRICTED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_RESTRICTED)

    const hashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds))

    await tx.userAccount.update({
      where: { userId: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        wrongLoginAttempts: 0,
        isRestricted: false,
        restrictionLeftAt: null
      }
    })

    await tx.token.delete({ where: { id: isTokenExist.id } })
    await AuthCache.invalidateAuthCache(user.id)
    return { message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS }
  })
}

const changePassword = async (userData: JwtPayload, payload: IChangePassword) => {
  const user = await prisma.user.findUnique({ 
    where: { id: userData.authId },
    include: { account: true }
  })
  if (!user || !user.account) throw new ApiError(StatusCodes.NOT_FOUND, AUTH_MESSAGES.ACCOUNT_NOT_FOUND)
  if (user.status === UserStatus.RESTRICTED) throw new ApiError(StatusCodes.FORBIDDEN, AUTH_MESSAGES.ACCOUNT_RESTRICTED)

  AuthHelper.assertNotLocked(user.account.isRestricted, user.account.restrictionLeftAt)

  const isMatch = await AuthHelper.isPasswordMatched(payload.currentPassword, user.account.password)
  if (!isMatch) {
    await AuthHelper.handleFailedPasswordAttempt(user.id, user.account.wrongLoginAttempts)
    throw new ApiError(StatusCodes.BAD_REQUEST, AUTH_MESSAGES.OLD_PASSWORD_INCORRECT)
  }

  if (payload.currentPassword === payload.newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, AUTH_MESSAGES.PASSWORD_SAME_AS_OLD)
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds))

  await prisma.userAccount.update({
    where: { userId: user.id },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      wrongLoginAttempts: 0,
      isRestricted: false,
      restrictionLeftAt: null
    }
  })
  await AuthCache.invalidateAuthCache(user.id)

  return { message: AUTH_MESSAGES.PASSWORD_CHANGED_SUCCESS }
}

// ═══ ACCOUNT MANAGEMENT ════════════════════════════════════════════════════

const deleteAccount = async (userData: JwtPayload, password: string) => {
  const user = await prisma.user.findUnique({ 
    where: { id: userData.authId },
    include: { account: true }
  })
  if (!user || user.status === UserStatus.DELETED || !user.account) throw new ApiError(StatusCodes.NOT_FOUND, AUTH_MESSAGES.ACCOUNT_NOT_FOUND)

  AuthHelper.assertNotLocked(user.account.isRestricted, user.account.restrictionLeftAt)

  const isMatch = await AuthHelper.isPasswordMatched(password, user.account.password)
  if (!isMatch) {
    await AuthHelper.handleFailedPasswordAttempt(user.id, user.account.wrongLoginAttempts)
    throw new ApiError(StatusCodes.UNAUTHORIZED, AUTH_MESSAGES.OLD_PASSWORD_INCORRECT)
  }

  await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.DELETED,
        email: `${user.email}_deleted_${Date.now()}`,
        verified: false,
      }
    })

    await tx.userAccount.update({
      where: { userId: user.id },
      data: {
        wrongLoginAttempts: 0,
        isRestricted: false,
        restrictionLeftAt: null,
      }
    })

    await tx.userDevice.deleteMany({
      where: { userId: user.id }
    })
  })

  await AuthCache.invalidateAuthCache(userData.authId)
  return AUTH_MESSAGES.ACCOUNT_DELETED_SUCCESS
}

export const AuthServices = {
  signup,
  login,
  socialLogin,
  handleGoogleLogin,
  refreshToken,
  verifyAccount,
  resendOtp,
  forgetPassword,
  resetPassword,
  changePassword,
  deleteAccount
}
