const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Every route requires a logged-in user; reading and voting are open to
// all members, while creating and deleting proposals stays admin-only.
router.use(protect);

// @route   GET /api/proposals
// @desc    Get all proposals
router.get('/', async (req, res) => {
    try {
        const proposals = await Proposal.find().sort({ createdAt: -1 });
        res.json(proposals);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/proposals
// @desc    Create a new proposal
router.post('/', adminOnly, async (req, res) => {
    try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        if (!title || title.length > 200) {
            return res.status(400).json({ message: 'Title is required (max 200 characters)' });
        }

        const admin = await User.findById(req.user.id).select('name');
        const proposal = await Proposal.create({
            title,
            proposedBy: admin?.name || 'Super Admin'
        });
        res.status(201).json(proposal);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/proposals/:id
// @desc    Delete a proposal
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid proposal id' });
        }

        await Proposal.findByIdAndDelete(req.params.id);
        res.json({ message: 'Proposal removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/proposals/:id/vote
// @desc    Vote on a proposal (Yes or No)
router.put('/:id/vote', async (req, res) => {
    try {
        const { voteType } = req.body;

        if (voteType !== 'yes' && voteType !== 'no') {
            return res.status(400).json({ message: 'voteType must be "yes" or "no"' });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid proposal id' });
        }

        const proposal = await Proposal.findById(req.params.id);

        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        // ➕ CHECK IF USER ALREADY VOTED ➕
        if (proposal.voters.includes(req.user.id)) {
            return res.status(400).json({ message: 'You have already voted on this proposal!' });
        }

        // Increment counts
        if (voteType === 'yes') {
            proposal.yesVotes += 1;
        } else {
            proposal.noVotes += 1;
        }

        // ➕ ADD USER TO VOTERS LIST ➕
        proposal.voters.push(req.user.id);

        await proposal.save();
        res.json(proposal);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;