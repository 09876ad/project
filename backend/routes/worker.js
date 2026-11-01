const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WorkerProfile = require('../models/WorkerProfile');
const { protect } = require('../middleware/authMiddleware');

// Everything customers need to book, and nothing private (reviews contain
// customer PII; the cooperative fund balance is internal).
const PUBLIC_PROFILE_FIELDS = 'skills experience rating reviewCount isVerified insuranceStatus';

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
            .select(PUBLIC_PROFILE_FIELDS)
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
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(400).json({ message: 'Invalid worker id' });
        }

        const profile = await WorkerProfile.findOne({ userId: req.params.userId })
            .select('-cooperativeFundBalance');
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

        if (!Array.isArray(skills) || !skills.every((skill) => typeof skill === 'string')) {
            return res.status(400).json({ message: 'Skills must be a list of service names' });
        }

        const years = Number(experience);
        if (!Number.isFinite(years) || years < 0 || years > 50) {
            return res.status(400).json({ message: 'Experience must be between 0 and 50 years' });
        }

        const profile = await WorkerProfile.findOneAndUpdate(
            { userId: req.user.id },
            { skills: skills.map((skill) => skill.trim()).filter(Boolean), experience: years },
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