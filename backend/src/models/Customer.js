import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema(
  {
    zipCode: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    number: { type: String, trim: true, default: '' },
    complement: { type: String, trim: true, default: '' },
    neighborhood: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, uppercase: true, default: '' },
  },
  { _id: false },
)

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    address: { type: addressSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
)

export const Customer = mongoose.model('Customer', customerSchema)
