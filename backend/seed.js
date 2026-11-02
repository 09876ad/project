const mongoose = require('mongoose');
const Service = require('./models/Service');
const { services } = require('./data/services');
require('dotenv').config();

async function seedServices() {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Service.bulkWrite(
        services.map((service) => ({
            updateOne: {
                filter: { slug: service.slug },
                update: { $set: service },
                upsert: true,
            },
        }))
    );

    // The original four category-level rows stay in place so old bookings keep
    // resolving, but they are retired from the customer-facing catalog.
    const retired = await Service.updateMany(
        { slug: { $exists: false } },
        { $set: { isActive: false } }
    );

    console.log(
        `Catalog ready: ${result.upsertedCount} added, ` +
        `${result.modifiedCount} updated, ${retired.modifiedCount} legacy rows retired.`
    );
}

seedServices()
    .then(() => mongoose.disconnect())
    .catch((error) => {
        console.error('Service seed failed:', error);
        process.exitCode = 1;
    });
