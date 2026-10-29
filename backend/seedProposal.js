const mongoose = require('mongoose');
const Proposal = require('./models/Proposal');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await Proposal.create({
        title: "Increase minimum wage for Plumbing services?",
        proposedBy: "Central Cooperative Board",
        yesVotes: 150,
        noVotes: 50,
        status: 'active'
    });
    console.log('✅ Default Proposal seeded!');
    process.exit();
});