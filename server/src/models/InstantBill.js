import mongoose from 'mongoose';

export const billStatuses = ['Draft', 'Issued', 'Paid', 'Overdue', 'Cancelled'];

const costingItemSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  mainService: String,
  subService: String,
  subServiceName: String,
  sacCode: String,
  description: String,
  basePrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 20 },
  discountAmount: { type: Number, default: 0 },
  taxableValue: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  priceType: { type: String, enum: ['Auto', 'Manual'], default: 'Manual' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByName: String,
}, { _id: false });

const instantBillSchema = new mongoose.Schema({
  billId: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  projectTitle: { type: String, required: true },
  billDate: { type: Date, default: Date.now },
  dueDate: Date,
  paymentTerms: { type: String, default: 'Due on Receipt' },
  notes: String,
  mainService: [String],
  subServices: [String],
  costingItems: [costingItemSchema],
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: billStatuses, default: 'Issued' },
}, { timestamps: true });

export default mongoose.model('InstantBill', instantBillSchema);
