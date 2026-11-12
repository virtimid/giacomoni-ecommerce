import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Admin } from '../models/Admin.js'

export async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || ''
    const [scheme, token] = authorization.split(' ')
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Acesso administrativo não autorizado.' })
    }
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: 'Autenticação ainda não configurada no servidor.' })
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Banco de dados temporariamente indisponível.' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const admin = await Admin.findOne({ _id: payload.sub, active: true })
    if (!admin) return res.status(401).json({ message: 'Sessão inválida ou expirada.' })

    req.admin = { id: admin._id, name: admin.name, email: admin.email }
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sessão inválida ou expirada.' })
    }
    next(error)
  }
}

