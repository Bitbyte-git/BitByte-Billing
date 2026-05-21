import mongoose from 'mongoose';

const quotationItemSchema = new mongoose.Schema({
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  description: String,
  estimatedCost: { type: Number, required: true, min: 0 },
  gstPercentage: { type: Number, default: 18, min: 0 },
  total: { type: Number, required: true, min: 0 }
}, { timestamps: true });

export default mongoose.model('QuotationItem', quotationItemSchema);
