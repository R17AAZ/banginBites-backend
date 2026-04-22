import { UserRole, OrderStatus, PaymentStatus, PaymentMethod, NotificationType } from '@prisma/client'
import bcrypt from 'bcrypt'
import config from '../src/config'
import prisma from '../src/shared/prisma'

async function main() {
  console.log('🌱 Starting database seeding...')

  // 0. Clean existing data for a fresh seed
  console.log('🧹 Cleaning existing data...')
  await prisma.notification.deleteMany()
  await prisma.review.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.dish.deleteMany()
  await prisma.category.deleteMany()
  await prisma.userAccount.deleteMany()
  await prisma.userMetrics.deleteMany()
  await prisma.user.deleteMany()

  const defaultPassword = await bcrypt.hash('password123', Number(config.bcrypt_salt_rounds) || 10)

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@banginbites.com',
      name: 'System Admin',
      role: UserRole.ADMIN,
      verified: true,
      account: { create: { password: defaultPassword } },
    },
  })
  console.log('✅ Admin user created')

  // 2. Create Sellers
  const seller1 = await prisma.user.create({
    data: {
      email: 'gordon@ramsay.com',
      name: 'Gordon Ramsay',
      role: UserRole.SELLER,
      verified: true,
      profile: 'https://images.unsplash.com/photo-1583394238182-6f71f3ef08c2?w=400',
      account: { create: { password: defaultPassword } },
      metrics: { create: { rating: 4.9, totalReview: 1500 } }
    },
  })

  const seller2 = await prisma.user.create({
    data: {
      email: 'jamie@oliver.com',
      name: 'Jamie Oliver',
      role: UserRole.SELLER,
      verified: true,
      profile: 'https://images.unsplash.com/photo-1577214224213-3dec025008cf?w=400',
      account: { create: { password: defaultPassword } },
      metrics: { create: { rating: 4.5, totalReview: 850 } }
    },
  })
  console.log('✅ Sellers created')

  // 3. Create Buyers
  const buyer1 = await prisma.user.create({
    data: {
      email: 'buyer@banginbites.com',
      name: 'Hungry Customer',
      role: UserRole.BUYER,
      verified: true,
      account: { create: { password: defaultPassword } },
    },
  })

  const buyer2 = await prisma.user.create({
    data: {
      email: 'foodie@gmail.com',
      name: 'Professional Foodie',
      role: UserRole.BUYER,
      verified: true,
      account: { create: { password: defaultPassword } },
    },
  })
  console.log('✅ Buyers created')

  // 4. Create Categories
  const catItalian = await prisma.category.create({
    data: { name: 'Italian', description: 'Authentic pasta and pizzas', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400' }
  })
  const catAsian = await prisma.category.create({
    data: { name: 'Asian Fusion', description: 'Sushi, noodles, and more', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' }
  })
  const catDeserts = await prisma.category.create({
    data: { name: 'Desserts', description: 'Sweet treats and cakes', image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400' }
  })
  console.log('✅ Categories created')

  // 5. Create Dishes
  const dish1 = await prisma.dish.create({
    data: {
      name: 'Beef Wellington',
      description: 'Prime beef wrapped in puff pastry with mushroom duxelles.',
      price: 45.00,
      categoryId: catItalian.id,
      sellerId: seller1.id,
      images: ['https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800']
    }
  })

  const dish2 = await prisma.dish.create({
    data: {
      name: 'Spicy Ramen',
      description: 'Rich tonkotsu broth with handmade noodles and chashu pork.',
      price: 16.50,
      categoryId: catAsian.id,
      sellerId: seller2.id,
      images: ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']
    }
  })

  const dish3 = await prisma.dish.create({
    data: {
      name: 'Tiramisu',
      description: 'Classic coffee-flavoured Italian dessert.',
      price: 8.99,
      categoryId: catDeserts.id,
      sellerId: seller1.id,
      images: ['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800']
    }
  })
  console.log('✅ Dishes created')

  // 6. Create Orders (Running & History)

  // Order 1: Delivered (Gordon, Beef Wellington, Buyer 1)
  const order1 = await prisma.order.create({
    data: {
      buyerId: buyer1.id,
      sellerId: seller1.id,
      totalAmount: 45.00,
      platformFee: 3.60,
      sellerAmount: 41.40,
      status: OrderStatus.DELIVERED,
      paymentMethod: PaymentMethod.ONLINE,
      paymentStatus: PaymentStatus.PAID,
      items: { create: [{ dishId: dish1.id, quantity: 1, price: 45.00 }] }
    }
  })

  // Order 2: Delivered (Jamie, Spicy Ramen, Buyer 2)
  const order2 = await prisma.order.create({
    data: {
      buyerId: buyer2.id,
      sellerId: seller2.id,
      totalAmount: 16.50,
      platformFee: 1.32,
      sellerAmount: 15.18,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      items: { create: [{ dishId: dish2.id, quantity: 1, price: 16.50 }] }
    }
  })

  // Order 3: Delivered (Gordon, Tiramisu, Buyer 1)
  const order3 = await prisma.order.create({
    data: {
      buyerId: buyer1.id,
      sellerId: seller1.id,
      totalAmount: 8.99,
      platformFee: 0.72,
      sellerAmount: 8.27,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      items: { create: [{ dishId: dish3.id, quantity: 1, price: 8.99 }] }
    }
  })

  // Order 4: Cancelled (Jamie, Spicy Ramen, Buyer 1)
  const order4 = await prisma.order.create({
    data: {
      buyerId: buyer1.id,
      sellerId: seller2.id,
      totalAmount: 33.00,
      platformFee: 2.64,
      sellerAmount: 30.36,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.REFUNDED,
      items: { create: [{ dishId: dish2.id, quantity: 2, price: 16.50 }] }
    }
  })
  console.log('✅ Orders populated (Running & History)')

  // 7. Create Reviews (with Replies and Hiding)

  // Normal Review
  await prisma.review.create({
    data: {
      reviewerId: buyer1.id,
      revieweeId: seller1.id,
      dishId: dish1.id,
      orderId: order1.id,
      rating: 5,
      review: "The Beef Wellington was perfection. Gordon never misses!"
    }
  })

  // Review with Reply
  await prisma.review.create({
    data: {
      reviewerId: buyer2.id,
      revieweeId: seller2.id,
      dishId: dish2.id,
      orderId: order2.id,
      rating: 4,
      review: "Ramen was great, but a bit too salty for me.",
      reply: "Thanks for the feedback! We'll adjust the seasoning next time.",
      repliedAt: new Date()
    }
  })

  // Hidden Review (Admin moderated)
  await prisma.review.create({
    data: {
      reviewerId: buyer1.id,
      revieweeId: seller2.id,
      dishId: dish2.id,
      orderId: order4.id,
      rating: 1,
      review: "This place is terrible! (Spam content to be hidden)",
      isHidden: true
    }
  })
  console.log('✅ Reviews populated (with replies and hidden states)')

  // 8. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        toId: buyer1.id,
        title: 'Order Confirmed!',
        body: 'Your order for Beef Wellington has been confirmed.',
        type: NotificationType.ORDER_STATUS_UPDATED,
        isRead: false
      },
      {
        toId: seller1.id,
        title: 'New Review!',
        body: 'A customer left a 5-star review for your Beef Wellington.',
        type: NotificationType.REVIEW_RECEIVED,
        isRead: true
      },
      {
        toId: buyer2.id,
        title: 'Seller Replied',
        body: 'Jamie Oliver replied to your review of Spicy Ramen.',
        type: NotificationType.REVIEW_RECEIVED,
        isRead: false
      }
    ]
  })
  console.log('✅ Notifications seeded')

  console.log('✨ Seed completed successfully!')
  console.log('\n--- Login Credentials ---')
  console.log('Admin:   admin@banginbites.com  | password123')
  console.log('Seller1: gordon@ramsay.com     | password123 (High Rating)')
  console.log('Seller2: jamie@oliver.com      | password123')
  console.log('Buyer1:  buyer@banginbites.com  | password123')
  console.log('Buyer2:  foodie@gmail.com      | password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
