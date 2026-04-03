const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  amount:      { type: Number, required: true },
  place:       { type: String, required: true },
  category:    { type: String, default: 'Other' },
  description: { type: String },
  date:        { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Settlement', settlementSchema);
