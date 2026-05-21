import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, validate: { validator: (v) => !v || /^\d{10}$/.test(v), message: 'Phone number must be 10 digits' } },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['Client', 'Accountant', 'Admin'], required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('User', userSchema);
