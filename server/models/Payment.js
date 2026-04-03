const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  groupId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Group',   required: true },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
  paidBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  toUser:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount:    { type: Number, required: true },
  note:      { type: String, default: '' },
  status:    { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
