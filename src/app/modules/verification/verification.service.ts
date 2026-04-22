import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import config from '../../../config'
import prisma from '../../../shared/prisma'
import { VerificationType } from '@prisma/client'
import { generateOtp, compareOtp } from '../../../utils/crypto'

// ==================== RATE LIMITING UTILITIES ====================

/**
 * Validates OTP request limits and cooldown
 * @throws ApiError if cooldown not elapsed or request limit exceeded
 */
const validateOtpRequest = async (
    identifier: string,
    type: VerificationType,
): Promise<void> => {
    const existing = await prisma.verification.findUnique({ 
        where: { 
            identifier_type: { identifier, type } 
        } 
    })

    if (!existing) return

    // Cooldown check
    if (existing.latestRequest) {
        const secondsSinceLast = (Date.now() - existing.latestRequest.getTime()) / 1000
        if (secondsSinceLast < Number(config.otp_request_cooldown_seconds)) {
            const waitTime = Math.ceil(Number(config.otp_request_cooldown_seconds) - secondsSinceLast)
            throw new ApiError(
                StatusCodes.TOO_MANY_REQUESTS,
                `Please wait ${waitTime} seconds before requesting a new OTP.`,
            )
        }
    }

    // Request limit check
    if (existing.requestCount >= Number(config.max_otp_request_allowed || 5)) {
        throw new ApiError(
            StatusCodes.TOO_MANY_REQUESTS,
            'Maximum OTP limit reached. Please try again in 15 minutes.',
        )
    }
}

// ==================== OTP MANAGEMENT ====================

/**
 * Creates or updates a verification record
 */
const upsertVerification = async (
    identifier: string,
    type: VerificationType,
): Promise<{ otp: string; expiresIn: Date }> => {
    const { otp, expiresIn, hashedOtp } = await generateOtp()

    await prisma.verification.upsert({
        where: {
            identifier_type: { identifier, type }
        },
        update: {
            otpHash: hashedOtp,
            otpExpiresAt: expiresIn,
            latestRequest: new Date(),
            attempts: 0,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            requestCount: { increment: 1 },
        },
        create: {
            identifier,
            type,
            otpHash: hashedOtp,
            otpExpiresAt: expiresIn,
            latestRequest: new Date(),
            attempts: 0,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            requestCount: 1,
        },
    })

    return { otp, expiresIn }
}

/**
 * Creates initial verification record for new user registration
 */
const createInitialVerification = async (
    identifier: string,
    type: VerificationType,
    tx?: any,
): Promise<{ otp: string; expiresIn: Date }> => {
    const { otp, expiresIn, hashedOtp } = await generateOtp()
    const client = tx || prisma

    await client.verification.create({
        data: {
            identifier,
            type,
            otpHash: hashedOtp,
            otpExpiresAt: expiresIn,
            latestRequest: new Date(),
            attempts: 0,
            requestCount: 1,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
    })

    return { otp, expiresIn }
}

// ==================== OTP VERIFICATION ====================

/**
 * Validates OTP attempts and expiry
 */
const getAndValidateVerification = async (
    identifier: string,
    type: VerificationType,
    tx?: any,
) => {
    const client = tx || prisma
    const verification = await client.verification.findUnique({
        where: {
            identifier_type: { identifier, type }
        }
    })

    if (!verification) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            'Invalid or expired session. Please resend OTP.',
        )
    }

    // Brute Force Protection: Check Attempts
    if (verification.attempts >= Number(config.max_otp_attempts)) {
        throw new ApiError(
            StatusCodes.TOO_MANY_REQUESTS,
            'Too many failed OTP attempts. Please request a new one.',
        )
    }

    // Expiry Check
    if (verification.otpExpiresAt && new Date() > verification.otpExpiresAt) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP has expired.')
    }

    return verification
}

/**
 * Verifies OTP code
 */
const verifyOtp = async (
    identifier: string,
    type: VerificationType,
    otp: string,
    tx?: any,
): Promise<boolean> => {
    const verification = await getAndValidateVerification(identifier, type, tx)
    const client = tx || prisma

    const isOtpValid = await compareOtp(otp, verification.otpHash!)

    if (!isOtpValid) {
        await client.verification.update({
            where: { id: verification.id },
            data: { attempts: { increment: 1 } },
        })

        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP.')
    }

    return true
}

// ==================== CLEANUP ====================

/**
 * Deletes a verification record after successful verification
 */
const deleteVerification = async (
    identifier: string,
    type: VerificationType,
    tx?: any,
): Promise<void> => {
    const client = tx || prisma
    try {
        await client.verification.delete({
            where: {
                identifier_type: { identifier, type }
            }
        })
    } catch (error) {
        // Ignore if already deleted
    }
}

export const VerificationService = {
    // Rate Limiting
    validateOtpRequest,

    // OTP Management
    upsertVerification,
    createInitialVerification,

    // Verification
    getAndValidateVerification,
    verifyOtp,

    // Cleanup
    deleteVerification,
}