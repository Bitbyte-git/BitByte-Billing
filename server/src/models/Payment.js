import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  paymentLabel: { type: String, default: 'Payment' },
  paymentStageOrder: { type: Number, default: 1 },
  amount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, required: true },
  transactionReference: String,
  notes: String,
  paymentDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Failed'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Failed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
