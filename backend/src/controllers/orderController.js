import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import {
  canTransitionStatus,
  escapeRegularExpression,
  normalizeRequestedItems,
  VALID_STATUSES,
} from '../services/orderRules.js'

function databaseIsAvailable(res) {
  if (mongoose.connection.readyState === 1) return true
  res.status(503).json({ message: 'Banco de dados temporariamente indisponível.' })
  return false
}

async function restoreStock(items) {
  for (const item of items) {
    await Product.updateOne(
      {
        _id: item.product,
        variants: { $elemMatch: { size: item.size, color: item.color } },
      },
      { $inc: { 'variants.$.stock': item.quantity } },
    )
  }
}

export async function createOrder(req, res, next) {
  if (!databaseIsAvailable(res)) return

  const { customer, deliveryAddress, items } = req.body
  if (!customer || !deliveryAddress || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Dados do pedido incompletos.' })
  }

  const requestedItems = normalizeRequestedItems(items)
  if (!requestedItems) {
    return res.status(400).json({ message: 'Há itens inválidos no pedido.' })
  }

  const reservedItems = []

  try {
    for (const item of requestedItems) {
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          active: true,
          variants: {
            $elemMatch: {
              size: item.size,
              color: item.color,
              stock: { $gte: item.quantity },
            },
          },
        },
        { $inc: { 'variants.$.stock': -item.quantity } },
        { new: true },
      )

      if (!product) {
        await restoreStock(reservedItems)
        return res.status(409).json({
          message: `O produto selecionado (${item.size}, ${item.color}) não possui estoque suficiente.`,
        })
      }

      const normalizedItem = {
        product: product._id,
        name: product.name,
        image: product.image,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
      }
      reservedItems.push(normalizedItem)
    }

    const total = reservedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const order = await Order.create({
      customer,
      deliveryAddress,
      items: reservedItems,
      total,
      stockReturned: false,
    })

    res.status(201).json({
      message: 'Pedido criado e estoque reservado com sucesso.',
      order: {
        id: order._id,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      },
    })
  } catch (error) {
    if (reservedItems.length) {
      try {
        await restoreStock(reservedItems)
      } catch (rollbackError) {
        console.error('Falha ao devolver estoque após erro no pedido:', rollbackError)
      }
    }
    next(error)
  }
}

export async function listOrders(req, res, next) {
  if (!databaseIsAvailable(res)) return

  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100)
    const filter = {}

    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status
    }
    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00.000`)
      const end = new Date(`${req.query.date}T23:59:59.999`)
      if (!Number.isNaN(start.getTime())) filter.createdAt = { $gte: start, $lte: end }
    }
    if (req.query.search) {
      const search = String(req.query.search).trim()
      const safeSearch = escapeRegularExpression(search)
      filter.$or = [
        { 'customer.name': { $regex: safeSearch, $options: 'i' } },
        { 'customer.email': { $regex: safeSearch, $options: 'i' } },
        { 'customer.phone': { $regex: safeSearch, $options: 'i' } },
      ]
      if (mongoose.isValidObjectId(search)) filter.$or.push({ _id: search })
    }

    const totalItems = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.json({
      orders,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getOrder(req, res, next) {
  if (!databaseIsAvailable(res)) return

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de pedido inválido.' })
    }
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado.' })
    res.json(order)
  } catch (error) {
    next(error)
  }
}

export async function updateOrderStatus(req, res, next) {
  if (!databaseIsAvailable(res)) return

  try {
    const nextStatus = String(req.body.status || '').toLowerCase()
    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: 'Status de pedido inválido.' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de pedido inválido.' })
    }

    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado.' })
    if (order.status === nextStatus) return res.json(order)

    if (!canTransitionStatus(order.status, nextStatus)) {
      return res.status(409).json({
        message: `Não é possível alterar um pedido ${order.status} para ${nextStatus}.`,
      })
    }

    if (nextStatus === 'cancelado' && !order.stockReturned) {
      await restoreStock(order.items)
      order.stockReturned = true
      order.cancelledAt = new Date()
    }

    order.status = nextStatus
    if (!Array.isArray(order.statusHistory)) order.statusHistory = []
    order.statusHistory.push({ status: nextStatus, changedAt: new Date() })
    await order.save()
    res.json({ message: 'Status atualizado com sucesso.', order })
  } catch (error) {
    next(error)
  }
}
