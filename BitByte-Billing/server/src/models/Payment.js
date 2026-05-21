import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, required: true },
  transactionReference: String,
  paymentDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Failed'], default: 'Paid' }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
