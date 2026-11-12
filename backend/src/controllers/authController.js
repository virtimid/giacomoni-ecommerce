import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Admin } from '../models/Admin.js'

export async function login(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Banco de dados temporariamente indisponível.' })
    }
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: 'JWT_SECRET não configurado no servidor.' })
    }

    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    if (!email || !password) return res.status(400).json({ message: 'Informe e-mail e senha.' })

    const admin = await Admin.findOne({ email, active: true }).select('+passwordHash')
    const passwordMatches = admin ? await bcrypt.compare(password, admin.passwordHash) : false
    if (!passwordMatches) return res.status(401).json({ message: 'E-mail ou senha incorretos.' })

    admin.lastLoginAt = new Date()
    await admin.save()
    const token = jwt.sign(
      { role: 'admin', email: admin.email },
      process.env.JWT_SECRET,
      { subject: String(admin._id), expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
    )

    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    })
  } catch (error) {
    next(error)
  }
}

export function getSession(req, res) {
  res.json({ admin: req.admin })
}

