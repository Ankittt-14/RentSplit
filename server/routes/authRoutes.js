const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');

const { sendOTP } = require('../utils/emailService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });
    
    user = await User.create({ name, email, password });
    res.status(201).json({ token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, profilePhoto: user.profilePhoto }});
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, profilePhoto: user.profilePhoto }});
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    console.log(`[AUTH] OTP for ${email}: ${otp}`);
    
    // Send email if credentials exist
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendOTP(email, otp);
      res.json({ message: 'OTP sent to your email' });
    } else {
      res.json({ message: 'OTP generated. Check server logs (Email not configured)', otp });
    }
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetPasswordToken: otp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Update Profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, profilePhoto } = req.body;
    const user = await User.findById(req.user._id);

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
    }

    if (name) user.name = name;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    await user.save();

    res.json({ user: { _id: user._id, name: user.name, email: user.email, profilePhoto: user.profilePhoto } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Change Password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// Get User Stats (Total Split, Trust Score)
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Calculate Total Split: Sum of all expense splits assigned to this user
    const expenses = await Expense.find({ 'splits.user': userId });
    let totalSplits = 0;
    expenses.forEach(exp => {
      const mySplit = exp.splits.find(s => s.user.toString() === userId.toString());
      if (mySplit) totalSplits += mySplit.amountOwed;
    });

    // 2. Calculate Trust Score: Based on approved payments vs total splits
    // Formula: (Total Approved Payments / (Total Splits + 1.1)) * 100, capped at 100
    const approvedPayments = await Payment.find({ paidBy: userId, status: 'approved' });
    const totalPaid = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // We also consider expenses the user PAID themselves as "paid splits"
    const frontedAmount = expenses
      .filter(exp => exp.paidBy.toString() === userId.toString())
      .reduce((sum, exp) => {
         const mySplit = exp.splits.find(s => s.user.toString() === userId.toString());
         return sum + (mySplit ? mySplit.amountOwed : 0);
      }, 0);

    const totalContribution = totalPaid + frontedAmount;
    
    let trustScore = 95; // Base score
    if (totalSplits > 0) {
      trustScore = Math.min(100, (totalContribution / totalSplits) * 100);
      // Small adjustment for reliability
      if (trustScore > 99.9) trustScore = 100;
    }

    res.json({
      totalSplits: parseFloat(totalSplits.toFixed(2)),
      totalContribution: parseFloat(totalContribution.toFixed(2)),
      trustScore: parseFloat(trustScore.toFixed(2))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
