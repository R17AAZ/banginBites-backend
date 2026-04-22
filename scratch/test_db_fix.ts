import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing query...');
    const result = await prisma.user.findMany({
      where: {
        role: UserRole.SELLER,
      },
      include: {
        categories: true,
      },
      take: 1,
    });
    console.log('Query successful! Found:', result.length, 'kitchens');
  } catch (error) {
    console.error('Query failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
