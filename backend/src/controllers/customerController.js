import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Customer } from '../models/Customer.js'
import { Order } from '../models/Order.js'

const publicCustomer = (customer) => ({
  id: customer._id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  address: customer.address || {},
})

function session(customer) {
  return {
    token: jwt.sign({ sub: customer._id.toString(), role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' }),
    customer: publicCustomer(customer),
  }
}

function unavailable(res) {
  if (mongoose.connection.readyState === 1) return false
  res.status(503).json({ message: 'Banco de dados temporariamente indisponível.' })
  return true
}

export async function register(req, res, next) {
  try {
    if (unavailable(res)) return
    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const phone = String(req.body.phone || '').trim()
    const password = String(req.body.password || '')
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, '').length < 10 || password.length < 8) {
      return res.status(400).json({ message: 'Informe nome, e-mail, telefone e uma senha com pelo menos 8 caracteres.' })
    }
    const customer = await Customer.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 12), lastLoginAt: new Date() })
    res.status(201).json(session(customer))
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' })
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    if (unavailable(res)) return
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const customer = await Customer.findOne({ email, active: true }).select('+passwordHash')
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' })
    }
    customer.lastLoginAt = new Date()
    await customer.save()
    res.json(session(customer))
  } catch (error) { next(error) }
}

export function getMe(req, res) { res.json({ customer: publicCustomer(req.customer) }) }

export async function updateMe(req, res, next) {
  try {
    const name = String(req.body.name || '').trim()
    const phone = String(req.body.phone || '').trim()
    if (!name || phone.replace(/\D/g, '').length < 10) return res.status(400).json({ message: 'Informe nome e telefone válidos.' })
    req.customer.name = name
    req.customer.phone = phone
    req.customer.address = req.body.address || {}
    await req.customer.save()
    res.json({ message: 'Dados atualizados.', customer: publicCustomer(req.customer) })
  } catch (error) { next(error) }
}

export async function changePassword(req, res, next) {
  try {
    const currentPassword = String(req.body.currentPassword || '')
    const newPassword = String(req.body.newPassword || '')
    if (newPassword.length < 8) return res.status(400).json({ message: 'A nova senha deve ter pelo menos 8 caracteres.' })
    const customer = await Customer.findById(req.customer._id).select('+passwordHash')
    if (!(await bcrypt.compare(currentPassword, customer.passwordHash))) return res.status(401).json({ message: 'Senha atual incorreta.' })
    customer.passwordHash = await bcrypt.hash(newPassword, 12)
    await customer.save()
    res.json({ message: 'Senha alterada com sucesso.' })
  } catch (error) { next(error) }
}

export async function listMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ customerAccount: req.customer._id }).sort({ createdAt: -1 })
    res.json({ orders })
  } catch (error) { next(error) }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const customer = await Customer.findOne({ email, active: true }).select('+passwordResetTokenHash +passwordResetExpiresAt')
    const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESET_EMAIL_FROM)
    if (customer) {
      const token = crypto.randomBytes(32).toString('hex')
      customer.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex')
      customer.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000)
      await customer.save()
      if (emailConfigured) {
        const origin = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '').split(',')[0].trim()
        const link = `${origin}/?customerReset=${token}&email=${encodeURIComponent(email)}`
        await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESET_EMAIL_FROM, to: email, subject: 'Redefinição de senha - Giacomoni', html: `<p>Use o link abaixo em até 30 minutos:</p><p><a href="${link}">Criar nova senha</a></p>` }) })
      }
    }
    res.json({ message: emailConfigured ? 'Se o e-mail estiver cadastrado, você receberá as instruções.' : 'A recuperação por e-mail ainda não foi ativada. Entre em contato com a loja.', emailConfigured })
  } catch (error) { next(error) }
}

export async function resetPassword(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const tokenHash = crypto.createHash('sha256').update(String(req.body.token || '')).digest('hex')
    if (password.length < 8) return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' })
    const customer = await Customer.findOne({ email, active: true, passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash')
    if (!customer) return res.status(400).json({ message: 'Link inválido ou expirado.' })
    customer.passwordHash = await bcrypt.hash(password, 12)
    customer.passwordResetTokenHash = null
    customer.passwordResetExpiresAt = null
    await customer.save()
    res.json({ message: 'Senha redefinida. Você já pode entrar.' })
  } catch (error) { next(error) }
}
