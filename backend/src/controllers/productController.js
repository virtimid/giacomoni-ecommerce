import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { escapeRegularExpression } from '../services/orderRules.js'

export async function listProducts(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        products: [],
        pagination: { page: 1, limit: 0, totalItems: 0, totalPages: 0 },
      })
    }

    const filter = { active: true }
    if (req.query.category) filter.category = req.query.category
    if (req.query.search) {
      const search = escapeRegularExpression(String(req.query.search).trim())
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ]
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 100)
    const totalItems = await Product.countDocuments(filter)
    const totalPages = Math.ceil(totalItems / limit)
    const products = await Product.find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.json({ products, pagination: { page, limit, totalItems, totalPages } })
  } catch (error) {
    next(error)
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })
    res.json(product)
  } catch (error) {
    next(error)
  }
}

export async function createProduct(req, res, next) {
  try {
    if (!String(req.body.reference || '').trim()) return res.status(400).json({ message: 'Informe a referência do produto.' })
    const product = await Product.create(req.body)
    res.status(201).json(product)
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Já existe um produto com esta referência.' })
    next(error)
  }
}

export async function updateProduct(req, res, next) {
  try {
    if (!String(req.body.reference || '').trim()) return res.status(400).json({ message: 'Informe a referência do produto.' })
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })
    res.json(product)
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Já existe um produto com esta referência.' })
    next(error)
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true })
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
