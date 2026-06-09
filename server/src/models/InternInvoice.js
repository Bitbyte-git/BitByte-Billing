import mongoose from 'mongoose';

const internInvoiceSchema = new mongoose.Schema({
  internId: { type: String, unique: true, sparse: true, trim: true },
  invoiceId: { type: String, unique: true, sparse: true },
  employeeName: { type: String, required: true, trim: true },
  collegeName: { type: String, trim: true },
  courseMajor: { type: String, trim: true },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  position: { type: String, trim: true },
  duration: { type: String, trim: true },
  amount: { type: Number, default: 0, min: 0 },
  invoiceDate: { type: Date, default: Date.now },
  paymentReceived: { type: Boolean, default: false },
  termsAndConditions: {
    type: String,
    default: 'This invoice is generated after confirming internship payment.'
  },
  source: { type: String, enum: ['Manual', 'Google Form'], default: 'Manual' },
  sourceRowId: { type: String, trim: true },
  sourceSyncedAt: Date,
  formResponse: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emailDeliveryStatus: { type: String, enum: ['Pending', 'Sent', 'Failed', 'Skipped'], default: 'Pending' },
  sentAt: Date,
  emailError: String
}, { timestamps: true });

export default mongoose.model('InternInvoice', internInvoiceSchema);
