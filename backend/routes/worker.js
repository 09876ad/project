const express = require('express');
const router = express.Router();
const WorkerProfile = require('../models/WorkerProfile');
const { protect } = require('../middleware/authMiddleware');

// GET /api/workers - Get workers by skill (for customer dashboard)
router.get('/', async (req, res) => {
    try {
        const { skill } = req.query;
        console.log('Searching for skill:', skill); // Debug log

        let query = { isVerified: true }; // Only show verified workers

        if (skill) {
            query.skills = skill;
        }

        const workerProfiles = await WorkerProfile.find(query)
            .populate('userId', 'name');

        console.log('Found workers:', workerProfiles.length); // Debug log
        res.json(workerProfiles);
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get worker profile by user ID
router.get('/profile/:userId', protect, async (req, res) => {
    try {
        const profile = await WorkerProfile.findOne({ userId: req.params.userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update worker profile (skills, experience)
router.put('/update-profile', protect, async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({ message: 'Only workers can update their profile' });
        }

        const { skills, experience } = req.body;

        const profile = await WorkerProfile.findOneAndUpdate(
            { userId: req.user.id },
            { skills, experience },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;