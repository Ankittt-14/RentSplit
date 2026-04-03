const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { getIO } = require('../socket/index');

// Submit a claim (any member)
router.post('/', protect, async (req, res) => {
  try {
    const { groupId, amount, category, description, image } = req.body;
    const claim = await Claim.create({
      groupId, submittedBy: req.user._id, amount, category, description, image
    });

    // Notify leader
    const group = await Group.findById(groupId);
    const notif = await Notification.create({
      user: group.leader,
      title: '📋 New Reimbursement Claim',
      message: `${req.user.name} added an expense for ₹${amount}.`,
      type: 'claim_submitted',
      metadata: { claimId: claim._id, groupId }
    });

    const io = getIO();
    if (io) {
      io.to(group.leader.toString()).emit('notification', notif);
    }

    res.status(201).json(claim);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get all claims for a group (leader sees all, member sees own)
router.get('/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    const isLeader = group.leader.toString() === req.user._id.toString();
    const filter = isLeader
      ? { groupId: req.params.groupId }
      : { groupId: req.params.groupId, submittedBy: req.user._id };
    const claims = await Claim.find(filter)
      .populate('submittedBy', 'name email profilePhoto')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Approve claim (leader only) — creates an expense automatically
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('submittedBy', 'name profilePhoto');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    const group = await Group.findById(claim.groupId);
    if (group.leader.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the leader can approve claims' });

    claim.status = 'approved';
    claim.approvedBy = req.user._id;
    await claim.save();

    // Auto-create an expense for this claim
    const sharePerMember = claim.amount / group.members.length;
    const splits = group.members.map(m => ({ user: m, amountOwed: parseFloat(sharePerMember.toFixed(2)) }));
    await Expense.create({
      groupId: claim.groupId,
      paidBy: claim.submittedBy._id,
      description: `[Claim] ${claim.description}`,
      amount: claim.amount,
      category: claim.category,
      splits
    });

    // Notify the claimant
    const notif = await Notification.create({
      user: claim.submittedBy._id, // Changed from claim.user to claim.submittedBy._id for correctness
      title: '✅ Claim Approved',
      message: `Your claim for "${claim.description}" has been approved.`,
      type: 'claim_approved', // Changed type from claim_submitted
      metadata: { claimId: claim._id, groupId: claim.groupId }
    });

    const io = getIO();
    if (io) {
      io.to(claim.submittedBy._id.toString()).emit('notification', notif); // Changed from claim.user to claim.submittedBy._id for correctness
    }

    res.json({ message: 'Claim approved', claim });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Reject claim (leader only)
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    const group = await Group.findById(claim.groupId);
    if (group.leader.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the leader can reject claims' });

    claim.status = 'rejected';
    claim.approvedBy = req.user._id;
    await claim.save();

    // Notify the claimant
    const notif = await Notification.create({
      user: claim.submittedBy, // Changed from claim.user to claim.submittedBy for correctness
      title: '❌ Claim Rejected',
      message: `Your claim for "${claim.description}" was rejected by the leader.`,
      type: 'claim_rejected', // Changed type from claim_submitted
      metadata: { claimId: claim._id, groupId: claim.groupId }
    });

    const io = getIO();
    if (io) {
      io.to(claim.submittedBy.toString()).emit('notification', notif); // Changed from claim.user to claim.submittedBy for correctness
    }

    res.json({ message: 'Claim rejected', claim });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
