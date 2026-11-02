const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { resolveSkills } = require('../lib/catalog');

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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid worker id' });
    }

    const { skills, experience } = req.body;
    if (!Array.isArray(skills) || !skills.every((skill) => typeof skill === 'string')) {
      return res.status(400).json({ message: 'Skills must be a list of service categories' });
    }

    const { resolved, unknown } = await resolveSkills(skills);
    if (unknown.length > 0) {
      return res.status(400).json({ message: `Unknown service category: ${unknown[0]}` });
    }

    const update = { skills: resolved };
    if (experience !== undefined) {
      const years = Number(experience);
      if (!Number.isFinite(years) || years < 0 || years > 50) {
        return res.status(400).json({ message: 'Experience must be between 0 and 50 years' });
      }
      update.experience = years;
    }

    const profile = await WorkerProfile.findByIdAndUpdate(
      req.params.id,
      update,
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