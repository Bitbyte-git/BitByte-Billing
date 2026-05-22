import mongoose from 'mongoose';

export const quotationStatuses = ['Draft', 'Submitted', 'Under Review', 'Needs Clarification', 'Forwarded to Admin', 'Approved', 'Rejected', 'Invoice Generated', 'Paid'];

const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimetype: { type: String, enum: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'] },
  size: { type: Number, max: 5 * 1024 * 1024 },
  url: String
}, { _id: false });

const costingItemSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  mainService: String,
  subService: String,
  subServiceName: String,
  description: String,
  basePrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 20 },
  discountAmount: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  priceType: { type: String, enum: ['Auto', 'Manual'], default: 'Manual' },
  addedByAccountant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByAccountantName: String,
  pricingAddedAt: Date
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  quotationId: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  servicesSelected: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  mainService: [String],
  subServices: [String],
  projectTitle: { type: String, required: true },
  projectDescription: { type: String, required: false },
  requirementDetails: String,
  preferredStartDate: Date,
  serviceRequirement: String,
  technologyPreference: String,
  referenceLinks: [String],
  priorityLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  confirmationAccepted: Boolean,
  attachments: [attachmentSchema],
  status: { type: String, enum: quotationStatuses, default: 'Draft' },
  accountantRemarks: String,
  adminRemarks: String,
  finalDiscountType: { type: String, enum: ['None', 'Percentage', 'Fixed Amount'], default: 'None' },
  finalDiscountValue: { type: Number, default: 0 },
  finalDiscountAmount: { type: Number, default: 0 },
  costingItems: [costingItemSchema],
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  submittedAt: Date
}, { timestamps: true });

export default mongoose.model('Quotation', quotationSchema);
