import mongoose from 'mongoose';

export const quotationStatuses = ['Draft', 'Submitted', 'Under Review', 'Needs Clarification', 'Forwarded to Admin', 'Approved', 'Rejected', 'Invoice Generated', 'Paid'];

const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimetype: { type: String, enum: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'] },
  size: { type: Number, max: 5 * 1024 * 1024 },
  url: String
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
  budgetRange: String,
  serviceRequirement: String,
  technologyPreference: String,
  referenceLinks: [String],
  priorityLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  confirmationAccepted: Boolean,
  attachments: [attachmentSchema],
  status: { type: String, enum: quotationStatuses, default: 'Draft' },
  accountantRemarks: String,
  adminRemarks: String,
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  submittedAt: Date
}, { timestamps: true });

export default mongoose.model('Quotation', quotationSchema);
