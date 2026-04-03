const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.json(notif);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
