import { DishServices } from '../src/app/modules/dish/dish.service';
import prisma from '../src/shared/prisma';

async function main() {
  try {
    // Get first dish from DB
    const dishes = await prisma.dish.findMany();
    if (dishes.length === 0) {
      console.log('No dishes found in DB');
      return;
    }
    const id = dishes[0].id;
    console.log('Trying to fetch dish with ID:', id);
    
    const result = await DishServices.getSingleDish(id);
    console.log('Service returned:', result ? 'A Dish' : 'NULL');
    if (result) {
      console.log('Dish keys:', Object.keys(result));
      console.log('Dish data:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
