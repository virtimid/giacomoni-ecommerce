import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'

export async function getDashboardStats(_req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Banco de dados temporariamente indisponível.' })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const [products, pendingOrders, todaySummary, lowStockProducts] = await Promise.all([
      Product.countDocuments({ active: true }),
      Order.countDocuments({ status: 'pendente' }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfDay }, status: { $ne: 'cancelado' } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]),
      Product.countDocuments({
        active: true,
        variants: { $elemMatch: { stock: { $lte: 3 } } },
      }),
    ])

    res.json({
      products,
      pendingOrders,
      lowStockProducts,
      todayOrders: todaySummary[0]?.orders || 0,
      todayRevenue: todaySummary[0]?.revenue || 0,
    })
  } catch (error) {
    next(error)
  }
}

