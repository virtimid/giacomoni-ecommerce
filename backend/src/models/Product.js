import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true, trim: true },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    variants: { type: [variantSchema], default: [] },
  },
  { timestamps: true },
)

export const Product = mongoose.model('Product', productSchema)

