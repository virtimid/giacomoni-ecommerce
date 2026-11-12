import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
    },
    deliveryAddress: {
      zipCode: { type: String, required: true, trim: true },
      street: { type: String, required: true, trim: true },
      number: { type: String, required: true, trim: true },
      complement: { type: String, trim: true, default: '' },
      neighborhood: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true, uppercase: true },
    },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pendente', 'enviado', 'concluído', 'cancelado'],
      default: 'pendente',
    },
    stockReturned: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: ['pendente', 'enviado', 'concluído', 'cancelado'],
            required: true,
          },
          changedAt: { type: Date, default: Date.now },
        },
      ],
      default: () => [{ status: 'pendente', changedAt: new Date() }],
    },
  },
  { timestamps: true },
)

export const Order = mongoose.model('Order', orderSchema)

