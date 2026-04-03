const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  type:       { type: String, default: 'PG / Flat' },
  inviteCode: { type: String, required: true, unique: true },
  leader:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  budget:     { type: Number, default: 0 },
  balances: [{
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    balance: { type: Number, default: 0 }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
