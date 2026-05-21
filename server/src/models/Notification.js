import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['Quotation', 'Invoice', 'Payment', 'System'], default: 'System' },
  status: { type: String, enum: ['Unread', 'Read'], default: 'Unread' }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Notification', notificationSchema);
