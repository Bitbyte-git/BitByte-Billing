import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  service: String,
  description: String,
  sacCode: String,
  quantity: { type: Number, default: 1 },
  taxableValue: Number,
  amount: Number,
  gstPercentage: Number,
  gstAmount: Number,
  cgstAmount: Number,
  sgstAmount: Number,
  igstAmount: Number,
  total: Number
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  discountType: { type: String, enum: ['None', 'Percentage', 'Fixed Amount'], default: 'None' },
  discountValue: { type: Number, default: 0 },
  discountedAmount: { type: Number, default: 0 },
  finalSubtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, required: true },
  finalTotal: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Overdue'], default: 'Pending' },
  pdfUrl: String,
  emailDeliveryStatus: { type: String, enum: ['Pending', 'Sent', 'Failed', 'Skipped'], default: 'Pending' },
  sentAt: Date,
  emailError: String
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);
