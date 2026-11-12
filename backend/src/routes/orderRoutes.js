import { Router } from 'express'
import {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from '../controllers/orderController.js'
import { requireAuth } from '../middleware/auth.js'

export const orderRouter = Router()

orderRouter.post('/', createOrder)
orderRouter.get('/', requireAuth, listOrders)
orderRouter.get('/:id', requireAuth, getOrder)
orderRouter.patch('/:id/status', requireAuth, updateOrderStatus)

