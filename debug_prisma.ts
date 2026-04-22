import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const email = "admin@example.com"
  const password = "Password123!"
  const salt = 12

  console.log("Starting test...")
  const hashedPassword = await bcrypt.hash(password, salt)

  try {
    const result = await prisma.user.create({
        data: {
          email: email,
          name: 'Admin',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          verified: true,
          account: {
            create: {
              password: hashedPassword,
            }
          },
          metrics: {
            create: {}
          }
        },
        include: {
          account: true,
          metrics: true,
        }
    })
    console.log("Success:", result)
  } catch (error: any) {
    console.error("Error Detail:", JSON.stringify(error, null, 2))
    console.error("Error Message:", error.message)
    if (error.code) console.error("Error Code:", error.code)
    if (error.meta) console.error("Error Meta:", error.meta)
  } finally {
    await prisma.$disconnect()
  }
}

main()
