import mongoose from 'mongoose';

const internInvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  employeeName: { type: String, required: true, trim: true },
  collegeName: { type: String, trim: true },
  address: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  position: { type: String, required: true, trim: true },
  duration: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  invoiceDate: { type: Date, default: Date.now },
  paymentReceived: { type: Boolean, default: true },
  termsAndConditions: {
    type: String,
    default: 'This invoice is generated after confirming internship payment.'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emailDeliveryStatus: { type: String, enum: ['Pending', 'Sent', 'Failed', 'Skipped'], default: 'Pending' },
  sentAt: Date,
  emailError: String
}, { timestamps: true });

export default mongoose.model('InternInvoice', internInvoiceSchema);
