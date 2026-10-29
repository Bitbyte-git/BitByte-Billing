import mongoose from 'mongoose';

const toSafeObjectId = (v) => {
  if (!v) return undefined;
  if (v instanceof mongoose.Types.ObjectId) return v;
  const str = String(v).trim();
  return /^[0-9a-fA-F]{24}$/.test(str) ? new mongoose.Types.ObjectId(str) : undefined;
};


const quotationItemSchema = new mongoose.Schema({
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', set: toSafeObjectId },
  mainService: { type: String, required: true },
  subService: { type: String, required: true },
  subServiceName: { type: String, required: true },
  sacCode: String,
  description: { type: String, default: '' },
  basePrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, default: 1, min: 1 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 20 },
  discountAmount: { type: Number, default: 0, min: 0 },
  gstPercentage: { type: Number, default: 18, min: 0 },
  gstAmount: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  isOptional: { type: Boolean, default: false },
  isComplimentary: { type: Boolean, default: false },
  priceType: { type: String, enum: ['Auto', 'Manual'], default: 'Auto' },
  addedByAccountant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByAccountantName: String,
  pricingAddedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('QuotationItem', quotationItemSchema);
