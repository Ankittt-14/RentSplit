const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { getIO } = require('../socket/index');

// Get all expenses for a group
router.get('/:groupId', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({ groupId: req.params.groupId })
                                  .populate('paidBy', 'name profilePhoto')
                                  .sort({ date: -1 });
    res.json(expenses);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Create expense
router.post('/', protect, async (req, res) => {
  try {
    const { groupId, description, amount, category, splits, image } = req.body;
    const expense = await Expense.create({
      groupId,
      paidBy: req.user._id,
      description,
      amount,
      category,
      splits,
      image
    });

    // Update group balances
    const group = await Group.findById(groupId);
    splits.forEach(split => {
      const gBalance = group.balances.find(b => b.user.toString() === split.user.toString());
      if (gBalance) {
        if (split.user.toString() === req.user._id.toString()) {
          // Payer gets back what others owe them
          gBalance.balance += (amount - split.amountOwed);
        } else {
          // Others owe the payer
          gBalance.balance -= split.amountOwed;
        }
      }
    });
    await group.save();

    // Create notifications for splits
    const notifications = splits.filter((s) => s.user.toString() !== req.user._id.toString()).map(split => ({
      user: split.user,
      title: 'New Expense Added',
      message: `${req.user.name} added "${description}". You owe ₹${split.amountOwed}.`,
      type: 'expense'
    }));
    const savedNotifs = await Notification.insertMany(notifications);
    
    const io = getIO();
    if (io) {
      savedNotifs.forEach(n => {
        io.to(n.user.toString()).emit('notification', n);
      });
    }

    res.status(201).json(expense);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get specific expense
router.get('/detail/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
                                 .populate('paidBy', 'name profilePhoto')
                                 .populate('splits.user', 'name profilePhoto');
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Update expense amount & recalculate splits
router.put('/:id', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });
    // Only payer or an admin can edit
    if (expense.paidBy.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Unauthorized' });

    expense.amount = amount;
    // recalculate splits evenly based on current length
    const share = amount / (expense.splits.length || 1);
    expense.splits.forEach(s => s.amountOwed = share);
    
    await expense.save();
    res.json(expense);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Delete expense (simple version, not reverting balances fully)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
