const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group',   required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  amount:      { type: Number, required: true },
  category:    { type: String, default: 'Other' },
  description: { type: String, required: true },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  image:      { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
