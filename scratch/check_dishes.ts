import prisma from '../src/shared/prisma';

async function main() {
  try {
    const dishes = await prisma.dish.findMany({
      include: {
        category: true,
        seller: true
      }
    });
    console.log('Total dishes in DB:', dishes.length);
    if (dishes.length > 0) {
      console.log('Dish 0 ID:', dishes[0].id);
      console.log('Dish 0 Name:', dishes[0].name);
      console.log('Dish 0 Data:', JSON.stringify(dishes[0], null, 2));
    }
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
