const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WorkerProfile = require('../models/WorkerProfile');
const { protect } = require('../middleware/authMiddleware');
const { resolveSkills } = require('../lib/catalog');

// Everything customers need to book, and nothing private (reviews contain
// customer PII; the cooperative fund balance is internal).
const PUBLIC_PROFILE_FIELDS = 'skills experience rating reviewCount isVerified insuranceStatus';

// GET /api/workers - Verified workers, optionally filtered by service category
router.get('/', async (req, res) => {
    try {
        const category = req.query.category ?? req.query.skill;

        const query = { isVerified: true };
        if (category !== undefined) {
            if (typeof category !== 'string' || !category.trim() || category.length > 50) {
                return res.status(400).json({ message: 'Invalid category' });
            }
            query.skills = category.trim();
        }

        const workerProfiles = await WorkerProfile.find(query)
            .select(PUBLIC_PROFILE_FIELDS)
            .populate('userId', 'name')
            .sort({ rating: -1 })
            .limit(50);

        res.json(workerProfiles);
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get worker profile by user ID
router.get('/profile/:userId', protect, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(400).json({ message: 'Invalid worker id' });
        }

        const isSelf = String(req.user.id) === String(req.params.userId);
        if (!isSelf && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
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

        const { resolved, unknown } = await resolveSkills(skills);
        if (unknown.length > 0) {
            return res.status(400).json({ message: `Unknown service category: ${unknown[0]}` });
        }

        const years = Number(experience);
        if (!Number.isFinite(years) || years < 0 || years > 50) {
            return res.status(400).json({ message: 'Experience must be between 0 and 50 years' });
        }

        const profile = await WorkerProfile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const approved = profile.skills || [];
        const changed =
            approved.length !== resolved.length ||
            resolved.some((skill) => !approved.includes(skill));

        profile.experience = years;
        if (changed) {
            // Approved skills keep running the worker's current jobs; the new
            // request waits for the cooperative board.
            profile.pendingSkills = resolved;
            profile.pendingSkillsRequestedAt = new Date();
        } else {
            // Editing back to the approved set withdraws any pending request.
            profile.pendingSkills = [];
            profile.pendingSkillsRequestedAt = undefined;
        }

        await profile.save();

        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;