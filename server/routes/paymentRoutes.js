const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Group   = require('../models/Group');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { getIO } = require('../socket/index');

// ── Utility: Minimum debt settlement graph ────────────────────────────────────
// Correctly computes net balance per member and produces minimum transactions.
async function calcDebts(groupId) {
  // Fetch group members for name lookup
  const group    = await Group.findById(groupId).populate('members', 'name profilePhoto');
  const expenses = await Expense.find({ groupId }).populate('paidBy', 'name _id profilePhoto');
  // Only peer-to-peer settle payments that have been APPROVED affect the debt graph
  const p2pPayments = await Payment.find({ groupId, toUser: { $exists: true, $ne: null }, status: 'approved' });

  // Build userMap from group members (guaranteed to have name)
  const userMap = {};
  for (const m of group.members) {
    userMap[m._id.toString()] = { _id: m._id, name: m.name };
  }

  // Net balance map: userId → net amount (positive = owed by others, negative = owes others)
  const net = {};

  for (const exp of expenses) {
    const payerId = exp.paidBy._id.toString();
    // The person who paid the bill is owed money by all other splitters
    net[payerId] = (net[payerId] || 0) + exp.amount;

    for (const split of exp.splits) {
      // split.user is always an ObjectId (not populated — _id: false on schema means no subdoc _id)
      const uid = split.user.toString();
      net[uid] = (net[uid] || 0) - split.amountOwed;
      // ensure userMap has this uid (in case payer not in members list yet)
      if (!userMap[uid] && group.members.find(m => m._id.toString() === uid)) {
        const m = group.members.find(m => m._id.toString() === uid);
        userMap[uid] = { _id: m._id, name: m.name };
      }
    }
  }

  // Apply peer-to-peer payments: paying reduces debt, receiving reduces credit
  for (const p of p2pPayments) {
    const from = p.paidBy.toString();
    const to   = p.toUser.toString();
    net[from] = (net[from] || 0) + p.amount;
    net[to]   = (net[to]   || 0) - p.amount;
  }

  // Separate into creditors (net > 0) and debtors (net < 0)
  const creditors = [];
  const debtors   = [];
  for (const [uid, balance] of Object.entries(net)) {
    if (balance >  0.01) creditors.push({ uid, amount:  balance });
    if (balance < -0.01) debtors.push({   uid, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort(  (a, b) => b.amount - a.amount);

  // Greedy minimum transactions
  const transactions = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);

    if (amount > 0.01) {
      transactions.push({
        from:   userMap[d.uid] || { _id: d.uid, name: 'Member' },
        to:     userMap[c.uid] || { _id: c.uid, name: 'Member' },
        amount: Math.round(amount * 100) / 100,
      });
    }

    c.amount -= amount;
    d.amount -= amount;
    if (c.amount < 0.01) ci++;
    if (d.amount < 0.01) di++;
  }

  return transactions;
}

// ── Record a payment (member pays their share of an expense) ──────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { groupId, expenseId, amount } = req.body;

    // Mark hasPaid on the split inside the expense
    const expense = await Expense.findById(expenseId);
    if (expense) {
      const split = expense.splits.find(s => s.user.toString() === req.user._id.toString());
      if (split) split.hasPaid = true;
      await expense.save();
    }

    const payment = await Payment.create({ groupId, expenseId, paidBy: req.user._id, amount });
    res.status(201).json(payment);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Peer-to-peer payment request: member notifies leader they've paid ─────────
router.post('/settle', protect, async (req, res) => {
  try {
    const { groupId, toUserId, amount, note, expenseId } = req.body;
    if (!groupId || !toUserId || !amount) return res.status(400).json({ message: 'groupId, toUserId and amount are required' });
    
    // Check if there is already a PENDING payment for this expense from this user
    if (expenseId) {
      const existingPending = await Payment.findOne({ 
        expenseId, 
        paidBy: req.user._id, 
        status: 'pending' 
      });
      if (existingPending) {
        return res.status(400).json({ message: 'A payment request is already pending for this expense. Please wait for approval.' });
      }
    }

    const payment = await Payment.create({
      groupId,
      expenseId,
      paidBy: req.user._id,
      toUser: toUserId,
      amount,
      note: note || '',
      status: 'pending',
    });

    // Fetch the Group to find the leader
    const group = await Group.findById(groupId);

    // Notify the creditor (toUser) AND the leader (if different)
    try {
      const payerName = req.user.name;
      const leaderId  = group?.leader;
      
      console.log(`[SETTLE] Creating notifications. Payer: ${payerName}, Creditor: ${toUserId}, Leader: ${leaderId}`);

      const notifData = {
        title:   'Payment Request',
        message: `${payerName} says they paid ₹${amount}${note ? ` — "${note}"` : ''}. Tap to verify and approve.`,
        type:    'payment_request',
        metadata: { paymentId: payment._id, groupId },
      };

      // 1. Notify toUser (Creditor)
      const notifToCreditor = await Notification.create({ ...notifData, user: toUserId });
      console.log(`[SETTLE] Notification created for Creditor ${toUserId}: ${notifToCreditor._id}`);
      
      const io = getIO();
      if (io) {
        io.to(toUserId.toString()).emit('notification', notifToCreditor);
        console.log(`[SETTLE] Socket emitted to Creditor ${toUserId}`);
      }

      // 2. Notify Leader (if leader is not the toUser)
      if (leaderId && leaderId.toString() !== toUserId.toString()) {
        const notifToLeader = await Notification.create({ ...notifData, user: leaderId });
        console.log(`[SETTLE] Notification created for Leader ${leaderId}: ${notifToLeader._id}`);
          if (io) {
            io.to(leaderId.toString()).emit('notification', notifToLeader);
            console.log(`[SETTLE] Socket emitted to Leader ${leaderId}`);
          }
        }
        
        // Notify the whole group room that something changed (for UI refresh)
        if (io) io.to(groupId.toString()).emit('group:updated', { groupId });
      } catch (err) {
      console.error("[SETTLE] Error creating payment notification:", err);
      return res.status(500).json({ message: "Payment recorded but failed to create notification: " + err.message });
    }

    const populated = await Payment.findById(payment._id)
      .populate('paidBy', 'name profilePhoto')
      .populate('toUser', 'name profilePhoto');

    res.status(201).json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Leader approves a pending payment ─────────────────────────────────────────
router.put('/settle/:paymentId/approve', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('paidBy', 'name profilePhoto');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const group = await Group.findById(payment.groupId);

    // Both the creditor (toUser) AND the Group Leader can approve
    const isCreditor = payment.toUser.toString() === req.user._id.toString();
    const isLeader = group && group.leader.toString() === req.user._id.toString();

    if (!isCreditor && !isLeader) {
      return res.status(403).json({ message: 'Only the recipient or group leader can approve this payment' });
    }

    payment.status = 'approved';
    await payment.save();

    // Sync with Expense model if expenseId is present
    if (payment.expenseId) {
      const expense = await Expense.findById(payment.expenseId);
      if (expense) {
        const split = expense.splits.find(s => s.user.toString() === (payment.paidBy._id || payment.paidBy).toString());
        if (split) {
          split.hasPaid = true;
          await expense.save();
          console.log(`[APPROVE] Updated expense split for ${payment.paidBy._id || payment.paidBy} on expense ${payment.expenseId}`);
        }
      }
    }

    // Notify the payer that payment was approved
    const notif = await Notification.create({
      user:    payment.paidBy._id,
      title:   'Payment Approved',
      message: `Your payment of ₹${payment.amount} has been verified and approved.`,
      type:    'payment_approved',
      metadata: { paymentId: payment._id, groupId: payment.groupId },
    });
    const io = getIO();
    if (io) {
      io.to(payment.paidBy._id.toString()).emit('notification', notif);
      io.to(payment.groupId.toString()).emit('group:updated', { groupId: payment.groupId });
    }

    res.json({ message: 'Payment approved', payment });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Leader rejects a pending payment ──────────────────────────────────────────
router.put('/settle/:paymentId/reject', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('paidBy', 'name profilePhoto');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const group = await Group.findById(payment.groupId);

    // Both the creditor (toUser) AND the Group Leader can reject
    const isCreditor = payment.toUser.toString() === req.user._id.toString();
    const isLeader = group && group.leader.toString() === req.user._id.toString();

    if (!isCreditor && !isLeader) {
      return res.status(403).json({ message: 'Only the recipient or group leader can reject this payment' });
    }

    payment.status = 'rejected';
    await payment.save();

    const notif = await Notification.create({
      user:    payment.paidBy._id,
      title:   'Payment Not Verified',
      message: `Your payment of ₹${payment.amount} could not be verified. Please resubmit.`,
      type:    'payment_request',
      metadata: { paymentId: payment._id, groupId: payment.groupId },
    });
    const io = getIO();
    if (io) {
      io.to(payment.paidBy._id.toString()).emit('notification', notif);
      io.to(payment.groupId.toString()).emit('group:updated', { groupId: payment.groupId });
    }

    res.json({ message: 'Payment rejected', payment });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Get debt graph for a group ────────────────────────────────────────────────
router.get('/:groupId/debts', protect, async (req, res) => {
  try {
    const debts = await calcDebts(req.params.groupId);
    res.json(debts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Get all payments for a group ──────────────────────────────────────────────
router.get('/:groupId', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ groupId: req.params.groupId })
      .populate('paidBy', 'name profilePhoto')
      .populate('toUser',   'name profilePhoto')
      .populate('expenseId', 'description amount')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Send payment reminder to unpaid members (leader only) ─────────────────────
router.post('/:groupId/remind', protect, async (req, res) => {
  try {
    const Group = require('../models/Group');
    const group = await Group.findById(req.params.groupId).populate('members', 'name profilePhoto');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.leader.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the leader can send reminders' });

    const expenses = await Expense.find({ groupId: req.params.groupId });
    const payments = await Payment.find({ groupId: req.params.groupId, status: 'approved' });
    
    // Calculate balances (Identity with calcDebts)
    const balances = {};
    group.members.forEach(m => { if (m) balances[m._id.toString()] = 0; });
    
    expenses.forEach(exp => {
      if (!exp.paidBy) return;
      const payerId = exp.paidBy.toString();
      balances[payerId] = (balances[payerId] || 0) + exp.amount;
      (exp.splits || []).forEach(s => {
        if (!s.user) return;
        const uid = (s.user._id || s.user).toString();
        balances[uid] = (balances[uid] || 0) - (s.amountOwed || 0);
      });
    });

    payments.forEach(p => {
      if (p.toUser && p.paidBy) {
        const from = (p.paidBy._id || p.paidBy).toString();
        const to = (p.toUser._id || p.toUser).toString();
        balances[from] = (balances[from] || 0) + p.amount;
        balances[to] = (balances[to] || 0) - p.amount;
      }
    });

    const notifications = [];
    group.members.forEach(m => {
      if (!m || m._id.toString() === req.user._id.toString()) return;
      const bal = balances[m._id.toString()] || 0;
      if (bal < -0.01) {
        notifications.push({
          user: m._id,
          title: 'Payment Reminder',
          message: `Please pay your share for group "${group.name}". You currently owe ${Math.abs(bal).toFixed(2)}.`,
          type: 'reminder',
        });
      }
    });

    if (notifications.length > 0) {
      const savedNotifs = await Notification.insertMany(notifications);
      const io = getIO();
      if (io) savedNotifs.forEach(n => io.to(n.user.toString()).emit('notification', n));
    }
    res.json({ reminded: notifications.length });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Send reminders across all groups (leader only) ─────────────────────────────
router.post('/remind-all', protect, async (req, res) => {
  try {
    const Group = require('../models/Group');
    const groups = await Group.find({ leader: req.user._id }).populate('members', 'name profilePhoto');
    let totalReminded = 0;
    const notifications = [];

    for (const group of groups) {
      const expenses = await Expense.find({ groupId: group._id });
      const payments = await Payment.find({ groupId: group._id, status: 'approved' });

      // Calculate balances
      const balances = {};
      group.members.forEach(m => balances[m._id.toString()] = 0);
      expenses.forEach(exp => {
        const payerId = exp.paidBy.toString();
        balances[payerId] = (balances[payerId] || 0) + exp.amount;
        (exp.splits || []).forEach(s => {
          if (!s.user) return;
          const uid = (s.user._id || s.user).toString();
          balances[uid] = (balances[uid] || 0) - (s.amountOwed || 0);
        });
      });

      payments.forEach(p => {
        if (p.toUser && p.paidBy) {
          const from = (p.paidBy._id || p.paidBy).toString();
          const to = (p.toUser._id || p.toUser).toString();
          balances[from] = (balances[from] || 0) + p.amount;
          balances[to] = (balances[to] || 0) - p.amount;
        }
      });

      (group.members || []).forEach(m => {
        if (!m || m._id.toString() === req.user._id.toString()) return;
        const bal = balances[m._id.toString()] || 0;
        if (bal < -0.01) {
          notifications.push({
            user: m._id,
            title: 'Payment Reminder',
            message: `Please pay your share for group "${group.name}". You still owe ₹${Math.abs(bal).toFixed(2)}.`,
            type: 'reminder',
          });
          totalReminded++;
        }
      });
    }

    if (notifications.length > 0) {
      const savedNotifs = await Notification.insertMany(notifications);
      const io = getIO();
      if (io) savedNotifs.forEach(n => io.to(n.user.toString()).emit('notification', n));
    }
    res.json({ reminded: totalReminded });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
