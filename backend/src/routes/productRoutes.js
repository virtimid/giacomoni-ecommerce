import { Router } from 'express'
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/productController.js'
import { requireAuth } from '../middleware/auth.js'

export const productRouter = Router()

productRouter.get('/', listProducts)
productRouter.get('/:id', getProduct)
productRouter.post('/', requireAuth, createProduct)
productRouter.put('/:id', requireAuth, updateProduct)
productRouter.delete('/:id', requireAuth, deleteProduct)

