const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['system', 'group', 'expense', 'settlement', 'claim_submitted', 'claim_approved', 'claim_rejected', 'reminder', 'payment_request', 'payment_approved', 'payment_rejected'], default: 'system' },
  read: { type: Boolean, default: false },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
