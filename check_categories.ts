import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const categories = await prisma.category.findMany();
  console.log('Categories:', categories);
}
main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
