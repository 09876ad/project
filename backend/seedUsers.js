const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');
const WorkerProfile = require('./models/WorkerProfile');

// Accounts advertised on the login page. Safe to re-run: existing users are
// left untouched, only missing ones are created.
const demoUsers = [
    {
        name: 'Super Admin',
        email: 'admin@ncct.gov.in',
        password: 'admin123',
        role: 'admin',
        phone: '9999999999',
        address: 'NCCT Head Office'
    },
    {
        name: 'Raju Kumar',
        email: 'raju@coop.com',
        password: 'password123',
        role: 'worker',
        phone: '9876543210',
        address: 'Bhubaneswar, Odisha',
        skills: ['Plumbing', 'Electrical']
    }
];

async function seedUsers() {
    await mongoose.connect(process.env.MONGO_URI);

    for (const { password, skills, ...userData } of demoUsers) {
        let user = await User.findOne({ email: userData.email });

        if (!user) {
            const salt = await bcrypt.genSalt(10);
            user = await User.create({
                ...userData,
                password: await bcrypt.hash(password, salt)
            });
            console.log(`✅ Created ${user.role}: ${user.email}`);
        } else {
            console.log(`↩️  Already exists (left unchanged): ${user.email}`);
        }

        if (user.role === 'worker') {
            const profile = await WorkerProfile.findOne({ userId: user._id });
            if (!profile) {
                await WorkerProfile.create({
                    userId: user._id,
                    skills: skills || [],
                    experience: 5,
                    isVerified: true,
                    insuranceStatus: 'Active',
                    cooperativeFundBalance: 0
                });
                console.log(`   + Verified worker profile created for ${user.email}`);
            }
        }
    }

    console.log('✅ Demo users seeded successfully!');
    process.exit(0);
}

seedUsers().catch((error) => {
    console.error('❌ Failed to seed demo users:', error.message);
    process.exit(1);
});
