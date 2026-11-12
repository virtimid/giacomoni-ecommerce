import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Admin } from '../models/Admin.js'

function createSession(admin) {
  const token = jwt.sign(
    { role: 'admin', email: admin.email },
    process.env.JWT_SECRET,
    { subject: String(admin._id), expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  )
  return { token, admin: { id: admin._id, name: admin.name, email: admin.email } }
}

export async function getSetupStatus(_req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Banco de dados temporariamente indisponível.' })
    }
    res.json({ setupRequired: (await Admin.countDocuments()) === 0 })
  } catch (error) {
    next(error)
  }
}

export async function setup(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Banco de dados temporariamente indisponível.' })
    }
    if (!process.env.JWT_SECRET || !process.env.ADMIN_SETUP_SECRET) {
      return res.status(503).json({ message: 'Configuração inicial indisponível.' })
    }
    if (await Admin.exists({})) {
      return res.status(409).json({ message: 'O primeiro administrador já foi configurado.' })
    }

    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const setupCode = String(req.body.setupCode || '').trim()
    if (!name || !email || password.length < 8 || !setupCode) {
      return res.status(400).json({ message: 'Informe nome, e-mail, senha com 8 caracteres e código de configuração.' })
    }
    if (setupCode !== process.env.ADMIN_SETUP_SECRET) {
      return res.status(401).json({ message: 'Código de configuração incorreto.' })
    }

    const admin = await Admin.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      active: true,
      lastLoginAt: new Date(),
    })
    res.status(201).json(createSession(admin))
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'O primeiro administrador já foi configurado.' })
    }
    next(error)
  }
}

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
    res.json(createSession(admin))
  } catch (error) {
    next(error)
  }
}

export function getSession(req, res) {
  res.json({ admin: req.admin })
}

