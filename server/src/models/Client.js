import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  companyName: String,
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true, match: /^\d{10}$/ },
  alternatePhone: { type: String, match: /^\d{10}$/ },
  address: String,
  gstin: { type: String, validate: { validator: (v) => !v || v.length === 15, message: 'GSTIN must be 15 characters' } },
  pan: { type: String, validate: { validator: (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), message: 'Invalid PAN format' } },
  industry: String,
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accountStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Client', clientSchema);
