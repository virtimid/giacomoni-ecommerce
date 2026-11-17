import mongoose from 'mongoose'

const siteContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  eyebrow: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  buttonText: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  imageEyebrow: { type: String, required: true, trim: true },
  imageTitle: { type: String, required: true, trim: true },
  imageSubtitle: { type: String, required: true, trim: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true })

export const SiteContent = mongoose.model('SiteContent', siteContentSchema)
