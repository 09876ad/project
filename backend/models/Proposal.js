const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    title: { type: String, required: true },
    proposedBy: { type: String, default: 'Super Admin' }, // Can be linked to User ID later
    yesVotes: { type: Number, default: 0 },
    noVotes: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // To track who has voted
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);
