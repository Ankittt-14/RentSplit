const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountOwed: { type: Number, required: true },
  hasPaid: { type: Boolean, default: false }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: 'Other' },
  splits: [splitSchema],
  image: { type: String },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
