const mongoose = require('mongoose');
const Service = require('./models/Service');
require('dotenv').config();

const seedData = [
    { name: 'Plumbing', category: 'Household', basePrice: 500 },
    { name: 'Electrical', category: 'Household', basePrice: 600 },
    { name: 'Deep Cleaning', category: 'Household', basePrice: 1200 },
    { name: 'Carpentry', category: 'Household', basePrice: 800 }
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await Service.deleteMany({});
    await Service.insertMany(seedData);
    console.log('✅ Services seeded successfully!');
    process.exit();
});