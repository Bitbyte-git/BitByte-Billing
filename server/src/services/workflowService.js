import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendNotificationEmail } from '../utils/email.js';

export async function recordAudit({ userId, action, entityType, entityId, oldValue, newValue }) {
  return AuditLog.create({ userId, action, entityType, entityId, oldValue, newValue });
}

export async function notifyRole({ role, title, message, type = 'Quotation' }) {
  const users = await User.find({ role, status: 'Active' });
  await Promise.all(users.map(async (user) => {
    await Notification.create({ userId: user._id, title, message, type });
    await sendNotificationEmail({ to: user.email, subject: title, text: message });
  }));
}

export async function changeQuotationStatus({ quotation, status, user, message }) {
  const oldStatus = quotation.status;
  quotation.status = status;
  await quotation.save();
  await recordAudit({
    userId: user?._id,
    action: `Quotation status changed to ${status}`,
    entityType: 'Quotation',
    entityId: quotation._id,
    oldValue: { status: oldStatus },
    newValue: { status }
  });
  await notifyRole({ role: 'Admin', title: `Quotation ${quotation.quotationId} updated`, message: message || `Status changed from ${oldStatus} to ${status}` });
  return quotation;
}
