import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Customer } from '../models/Customer.js'

async function authenticateCustomer(req, res, next, required) {
  try {
    const [scheme, token] = String(req.headers.authorization || '').split(' ')
    if (scheme !== 'Bearer' || !token) {
      if (!required) return next()
      return res.status(401).json({ message: 'Entre na sua conta para continuar.' })
    }
    if (!process.env.JWT_SECRET || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Autenticação temporariamente indisponível.' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'customer') throw new Error('InvalidCustomerRole')
    const customer = await Customer.findOne({ _id: payload.sub, active: true })
    if (!customer) return res.status(401).json({ message: 'Sessão inválida ou expirada.' })
    req.customer = customer
    next()
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'InvalidCustomerRole'].includes(error.name) || error.message === 'InvalidCustomerRole') {
      return res.status(401).json({ message: 'Sessão inválida ou expirada.' })
    }
    next(error)
  }
}

export const requireCustomerAuth = (req, res, next) => authenticateCustomer(req, res, next, true)
export const optionalCustomerAuth = (req, res, next) => authenticateCustomer(req, res, next, false)
