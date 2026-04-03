const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { protect } = require('../middleware/authMiddleware');

// helper: check caller is group leader
const isLeader = (group, userId) => group.leader.toString() === userId.toString();

// Get all groups for user
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate('members', 'name email profilePhoto');
    res.json(groups);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Create group — creator becomes leader
router.post('/', protect, async (req, res) => {
  try {
    const { name, type } = req.body;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const group = await Group.create({
      name,
      type: type || 'PG / Flat',
      inviteCode,
      leader: req.user._id,
      members: [req.user._id],
      balances: [{ user: req.user._id, balance: 0 }]
    });
    res.status(201).json(group);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Join group
router.post('/join', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) return res.status(404).json({ message: 'Invalid invite code' });
    if (!group.members.includes(req.user._id)) {
      group.members.push(req.user._id);
      group.balances.push({ user: req.user._id, balance: 0 });
      await group.save();
    }
    res.json({ group });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get global owed summary for leader (MUST be before /:id to avoid param conflict)
router.get('/owed-summary', protect, async (req, res) => {
  try {
    const Expense = require('../models/Expense');
    const Payment = require('../models/Payment');
    
    // Find groups where user is leader
    const groups = await Group.find({ leader: req.user._id });
    
    let totalOwed = 0;
    let groupsWithDebt = 0;

    for (const group of groups) {
      const expenses = await Expense.find({ groupId: group._id });
      const totalDue = expenses.reduce((sum, exp) => {
        const mySplit = exp.splits.find(s => (s.user._id || s.user).toString() === req.user._id.toString());
        return sum + (mySplit ? mySplit.amountOwed : 0);
      }, 0);

      const payments = await Payment.find({ groupId: group._id, status: 'approved' });
      const p2pSent = payments
        .filter(p => p.paidBy.toString() === req.user._id.toString())
        .reduce((s, p) => s + p.amount, 0);
        
      const fronted = expenses
        .filter(e => e.paidBy.toString() === req.user._id.toString())
        .reduce((s, e) => s + e.amount, 0);

      const contribution = p2pSent + fronted;
      const remaining = totalDue - contribution;

      if (remaining > 0.01) {
        totalOwed += remaining;
        groupsWithDebt++;
      }
    }

    res.json({ totalOwed: parseFloat(totalOwed.toFixed(2)), groupCount: groupsWithDebt });
  } catch (error) {
    const fs = require('fs');
    fs.appendFileSync('error.log', `\n[${new Date().toISOString()}] Error in /owed-summary: ${error.stack}\n`);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Get group detail
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email profilePhoto')
      .populate('leader', 'name email profilePhoto')
      .populate('balances.user', 'name profilePhoto');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Set / update budget (leader only)
router.put('/:id/budget', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!isLeader(group, req.user._id)) return res.status(403).json({ message: 'Only the leader can set the budget' });
    group.budget = req.body.budget;
    await group.save();
    res.json({ budget: group.budget });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get group summary (budget, total spent, per-member payment status)
router.get('/:id/summary', protect, async (req, res) => {
  try {
    const Expense  = require('../models/Expense');
    const Payment  = require('../models/Payment');
    const group = await Group.findById(req.params.id).populate('members', 'name email profilePhoto');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const expenses = await Expense.find({ groupId: req.params.id });
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

    // Only count: (a) expense-linked payments (Mark Paid button) OR (b) approved peer-to-peer payments
    const payments = await Payment.find({
      groupId: req.params.id,
      $or: [
        { toUser: { $exists: false } },
        { toUser: null },
        { status: 'approved' },
      ]
    });

    try {
      // ── Unified Balance Calculation (Identity with calcDebts) ──────────────────
      const memberBalances = {};
      group.members.forEach(m => memberBalances[m._id.toString()] = 0);

      expenses.forEach(exp => {
        if (!exp.paidBy) return;
        const payerId = exp.paidBy.toString();
        memberBalances[payerId] = (memberBalances[payerId] || 0) + exp.amount;
        (exp.splits || []).forEach(s => {
          if (!s.user) return;
          const uid = (s.user._id || s.user).toString();
          memberBalances[uid] = (memberBalances[uid] || 0) - (s.amountOwed || 0);
        });
      });

      payments.forEach(p => {
        if (p.status === 'approved' && p.toUser && p.paidBy) {
          const from = (p.paidBy._id || p.paidBy).toString();
          const to = (p.toUser._id || p.toUser).toString();
          memberBalances[from] = (memberBalances[from] || 0) + p.amount;
          memberBalances[to] = (memberBalances[to] || 0) - p.amount;
        }
      });

      const memberStatus = group.members.map(m => {
        const mid = m._id.toString();
        const balance = memberBalances[mid] || 0;
        
        const userDue = expenses.reduce((sum, exp) => {
          const mySplit = (exp.splits || []).find(s => s.user && (s.user._id || s.user).toString() === mid);
          return sum + (mySplit ? (mySplit.amountOwed || 0) : 0);
        }, 0);

        // amountPaid: How much of their total due have they covered?
        const remaining = balance < -0.01 ? Math.abs(balance) : 0;
        const amountPaid = Math.max(userDue - remaining, 0);

        return {
          user: { _id: m._id, name: m.name, email: m.email },
          amountDue: parseFloat(userDue.toFixed(2)),
          amountPaid: parseFloat(amountPaid.toFixed(2)),
          remaining: parseFloat(remaining.toFixed(2)),
          status: remaining < 0.01 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
        };
      });

      const settledAmount = memberStatus.reduce((s, m) => s + m.amountPaid, 0);

      // Check if any member has a pending payment request
      const pendingPayments = await Payment.find({ groupId: req.params.id, status: 'pending' })
        .populate('paidBy', 'name profilePhoto');
      const pendingSummary = pendingPayments.map(p => ({
        paymentId: p._id,
        expenseId: p.expenseId,
        from: { _id: p.paidBy._id, name: p.paidBy.name },
        amount: p.amount,
        note: p.note,
      }));

      res.json({
        budget: group.budget,
        totalSpent,
        sharePerMember: parseFloat((totalSpent / (group.members.length || 1)).toFixed(2)),
        memberCount: group.members.length,
        settledAmount: parseFloat(settledAmount.toFixed(2)),
        memberStatus,
        pendingSummary,
      });
    } catch (calcError) {
      console.error("[SUMMARY ERROR]", calcError);
      res.status(500).json({ message: "Calculation error: " + calcError.message });
    }
  } catch (error) { res.status(500).json({ message: error.message }); }
});


// Get balances
router.get('/:id/balances', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('balances.user', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({ balances: group.balances });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get settlements (placeholder)
router.get('/:id/settlements', protect, async (req, res) => {
  res.json({ settlements: [] });
});

// Remove member (leader only)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!isLeader(group, req.user._id)) return res.status(403).json({ message: 'Only the leader can remove members' });
    if (req.params.userId === group.leader.toString()) return res.status(400).json({ message: 'Leader cannot be removed' });

    // Remove from members array
    group.members = group.members.filter(m => m.toString() !== req.params.userId.toString());
    // Remove from balances array
    group.balances = group.balances.filter(b => b.user.toString() !== req.params.userId.toString());

    await group.save();
    res.json({ message: 'Member removed successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
