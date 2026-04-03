const express = require('express');
const router = express.Router();
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { protect } = require('../middleware/authMiddleware');

// Leader records a settlement transaction (paid at a place)
router.post('/', protect, async (req, res) => {
  try {
    const { groupId, amount, place, category, description, date } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.leader.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the leader can record settlements' });

    const settlement = await Settlement.create({
      groupId, paidBy: req.user._id, amount, place, category, description,
      date: date ? new Date(date) : new Date()
    });
    res.status(201).json(settlement);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get all settlements for a group
router.get('/:groupId', protect, async (req, res) => {
  try {
    const settlements = await Settlement.find({ groupId: req.params.groupId })
      .populate('paidBy', 'name profilePhoto')
      .sort({ date: -1 });
    res.json(settlements);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Delete a settlement (leader only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ message: 'Not found' });
    const group = await Group.findById(settlement.groupId);
    if (group.leader.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the leader can delete settlements' });
    await Settlement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Settlement deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
