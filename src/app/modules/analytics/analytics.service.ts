import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client'
import prisma from '../../../shared/prisma'

/**
 * Aggregates statistics for a specific seller.
 */
const getSellerStats = async (sellerId: string) => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [totalStats, todayStats, orderCounts, topDishes, metrics] = await Promise.all([
    // 1. Total Earnings (Sum of sellerAmount for paid orders)
    prisma.order.aggregate({
      where: { 
        sellerId, 
        OR: [
          { paymentStatus: PaymentStatus.PAID },
          { status: OrderStatus.DELIVERED }
        ]
      },
      _sum: { sellerAmount: true },
      _count: { id: true },
    }),

    // 2. Today's Earnings
    prisma.order.aggregate({
      where: {
        sellerId,
        OR: [
          { paymentStatus: PaymentStatus.PAID },
          { status: OrderStatus.DELIVERED }
        ],
        createdAt: { gte: startOfToday },
      },
      _sum: { sellerAmount: true },
      _count: { id: true },
    }),

    // 3. Order status distribution
    prisma.order.groupBy({
      by: ['status'],
      where: { sellerId },
      _count: { id: true },
    }),

    // 4. Top 5 Dishes (by quantity sold)
    prisma.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: {
          sellerId,
          OR: [
            { paymentStatus: PaymentStatus.PAID },
            { status: OrderStatus.DELIVERED }
          ],
        },
      },
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 5,
    }),

    // 5. Ratings & Reviews
    prisma.userMetrics.findUnique({
      where: { userId: sellerId },
      select: { rating: true, totalReview: true },
    }),
  ])

  // Fetch dish names for top dishes
  const topDishesWithNames = await Promise.all(
    topDishes.map(async item => {
      const dish = await prisma.dish.findUnique({
        where: { id: item.dishId },
        select: { name: true },
      })
      return {
        dishId: item.dishId,
        name: dish?.name || 'Unknown',
        totalSold: item._sum.quantity || 0,
      }
    }),
  )

  return {
    earnings: {
      total: totalStats._sum.sellerAmount || 0,
      today: todayStats._sum.sellerAmount || 0,
      totalOrders: totalStats._count.id || 0,
      todayOrders: todayStats._count.id || 0,
    },
    ordersByStatus: orderCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id
      return acc
    }, {} as Record<string, number>),
    topDishes: topDishesWithNames,
    metrics: {
      rating: metrics?.rating || 0,
      totalReviews: metrics?.totalReview || 0,
    },
  }
}

/**
 * Aggregates global statistics for application administrators.
 */
const getAdminStats = async () => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [platformStats, userCounts, growth, recentOrders, categoryStats] = await Promise.all([
    // 1. Total Financials
    prisma.order.aggregate({
      where: { 
        OR: [
          { paymentStatus: PaymentStatus.PAID },
          { status: OrderStatus.DELIVERED }
        ]
      },
      _sum: { totalAmount: true, platformFee: true },
      _count: { id: true },
    }),

    // 2. User Distribution
    prisma.user.groupBy({
      by: ['role'],
      where: { status: { not: 'DELETED' } },
      _count: { id: true },
    }),

    // 3. Growth: New users in last 30 days
    prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'DELETED' },
      },
    }),

    // 4. Recent Transactions
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          select: { name: true, profile: true }
        }
      }
    }),

    // 5. Category Distribution (Inventory Health)
    prisma.category.findMany({
      select: {
        name: true,
        _count: {
          select: { dishes: true }
        }
      }
    })
  ])

  return {
    totalGMV: platformStats._sum.totalAmount || 0,
    feesCollected: platformStats._sum.platformFee || 0,
    totalOrders: platformStats._count.id || 0,
    totalUsers: userCounts.reduce((acc, curr) => acc + curr._count.id, 0),
    userDistribution: userCounts.reduce((acc, curr) => {
      acc[curr.role] = curr._count.id
      return acc
    }, {} as Record<string, number>),
    newUsersLast30Days: growth,
    recentOrders: recentOrders.map((order: any) => ({
      ...order,
      user: order.buyer // Map back to 'user' for frontend simplicity or just use 'buyer'
    })),
    categoryStats: categoryStats.map(c => ({
      name: c.name,
      count: c._count.dishes
    }))
  }
}

/**
 * Aggregates detailed analytics for a seller with time-based filtering.
 */
const getDetailedSellerAnalytics = async (sellerId: string, year: number, month?: number) => {
  const startDate = new Date(year, month !== undefined ? month - 1 : 0, 1)
  const endDate = new Date(year, month !== undefined ? month : 12, 0, 23, 59, 59)

  const paidOrders = await prisma.order.findMany({
    where: {
      sellerId,
      OR: [
        { paymentStatus: PaymentStatus.PAID },
        { status: OrderStatus.DELIVERED }
      ],
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: {
        include: {
          dish: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  })

  // 1. Process Monthly Revenue (for the selected year)
  const monthlyData: Record<number, { amount: number; orders: number }> = {}
  // Initialize with zeros if we are looking at a full year
  if (month === undefined) {
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { amount: 0, orders: 0 }
    }
  }

  // 2. Process Category Sales
  const categoryData: Record<string, { amount: number; quantity: number }> = {}

  // 3. Process Top Dishes
  const dishSales: Record<string, { name: string; amount: number; quantity: number }> = {}

  paidOrders.forEach(order => {
    const orderDate = new Date(order.createdAt)
    const m = orderDate.getMonth()

    if (monthlyData[m]) {
      monthlyData[m].amount += order.sellerAmount
      monthlyData[m].orders += 1
    } else if (month !== undefined) {
      // If filtering by specific month, we still track it
      if (!monthlyData[m]) monthlyData[m] = { amount: 0, orders: 0 }
      monthlyData[m].amount += order.sellerAmount
      monthlyData[m].orders += 1
    }

    order.items.forEach(item => {
      const categoryName = item.dish?.category?.name || 'Uncategorized'
      const dishName = item.dish?.name || 'Unknown'
      const itemAmount = item.price * item.quantity

      // Aggregate categories
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = { amount: 0, quantity: 0 }
      }
      categoryData[categoryName].amount += itemAmount
      categoryData[categoryName].quantity += item.quantity

      // Aggregate dishes
      if (!dishSales[item.dishId]) {
        dishSales[item.dishId] = { name: dishName, amount: 0, quantity: 0 }
      }
      dishSales[item.dishId].amount += itemAmount
      dishSales[item.dishId].quantity += item.quantity
    })
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const formattedMonthlyRevenue = Object.entries(monthlyData)
    .map(([m, data]) => ({
      month: monthNames[parseInt(m)],
      amount: parseFloat(data.amount.toFixed(2)),
      orders: data.orders,
    }))
    .sort((a, b) => monthNames.indexOf(a.month) - monthNames.indexOf(b.month))

  const formattedCategorySales = Object.entries(categoryData).map(([name, data]) => ({
    category: name,
    amount: parseFloat(data.amount.toFixed(2)),
    quantity: data.quantity,
  }))

  const formattedTopDishes = Object.values(dishSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  return {
    monthlyRevenue: formattedMonthlyRevenue,
    categorySales: formattedCategorySales,
    topDishes: formattedTopDishes,
    summary: {
      totalRevenue: paidOrders.reduce((sum, o) => sum + o.sellerAmount, 0),
      totalOrders: paidOrders.length,
      avgOrderValue: paidOrders.length > 0 
        ? paidOrders.reduce((sum, o) => sum + o.sellerAmount, 0) / paidOrders.length 
        : 0
    }
  }
}

/**
 * Aggregates detailed platform revenue for administrators.
 */
const getAdminDetailedAnalytics = async (year: number) => {
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31, 23, 59, 59)

  const paidOrders = await prisma.order.findMany({
    where: {
      OR: [
        { paymentStatus: PaymentStatus.PAID },
        { status: OrderStatus.DELIVERED }
      ],
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalAmount: true,
      platformFee: true,
      createdAt: true,
    },
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyData: Record<number, { gmv: number; fees: number; orders: number }> = {}
  
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { gmv: 0, fees: 0, orders: 0 }
  }

  paidOrders.forEach(order => {
    const month = new Date(order.createdAt).getMonth()
    if (monthlyData[month]) {
      monthlyData[month].gmv += order.totalAmount
      monthlyData[month].fees += order.platformFee
      monthlyData[month].orders += 1
    }
  })

  const formattedRevenue = Object.entries(monthlyData).map(([m, data]) => ({
    month: monthNames[parseInt(m)],
    gmv: parseFloat(data.gmv.toFixed(2)),
    fees: parseFloat(data.fees.toFixed(2)),
    orders: data.orders,
  }))

  return {
    revenueTrend: formattedRevenue,
    summary: {
      totalGMV: paidOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      totalFees: paidOrders.reduce((sum, o) => sum + o.platformFee, 0),
      totalOrders: paidOrders.length,
    }
  }
}

export const AnalyticsService = {
  getSellerStats,
  getAdminStats,
  getDetailedSellerAnalytics,
  getAdminDetailedAnalytics,
}
