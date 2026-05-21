import mongoose from 'mongoose';

const remarkSchema = new mongoose.Schema({
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Client', 'Accountant', 'Admin'], required: true },
  message: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Remark', remarkSchema);
