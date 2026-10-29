const express = require('express');
const router = express.Router();
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Apply middleware to all routes in this file
router.use(protect);
router.use(adminOnly);

// @route   GET /api/admin/workers
// @desc    Get all worker profiles with user details
router.get('/workers', async (req, res) => {
  try {
    const workers = await WorkerProfile.find().populate('userId', 'name email phone address');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/workers/:id/verify
// @desc    Approve or reject a worker's verification
router.put('/workers/:id/verify', async (req, res) => {
  try {
    const { isVerified } = req.body; // true or false
    const profile = await WorkerProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    profile.isVerified = isVerified;
    if (isVerified) {
      profile.insuranceStatus = 'Active'; // Activate insurance upon approval
    } else {
      profile.insuranceStatus = 'Inactive';
    }

    await profile.save();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update worker skills (Admin only)
router.put('/workers/:id/update-skills', async (req, res) => {
  try {
    const { skills, experience } = req.body;
    const profile = await WorkerProfile.findByIdAndUpdate(
      req.params.id,
      { skills, experience },
      { new: true }
    ).populate('userId', 'name email');

    if (!profile) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get real-time platform analytics
router.get('/stats', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const User = require('../models/User');

    // 1. Count Users
    const totalWorkers = await User.countDocuments({ role: 'worker' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // 2. Count Bookings
    const totalBookings = await Booking.countDocuments();

    // 3. Calculate Total Welfare Fund (Only from completed jobs)
    const completedBookings = await Booking.find({ status: 'completed' });
    const totalWelfare = completedBookings.reduce((sum, booking) => sum + booking.cooperativeFundContribution, 0);

    res.json({
      totalWorkers,
      totalCustomers,
      totalBookings,
      totalWelfare
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;