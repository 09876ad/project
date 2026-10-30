const express = require('express');
const router = express.Router();
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
        const { title } = req.body;
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
        } else if (voteType === 'no') {
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