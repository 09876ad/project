const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

const PUBLIC_FIELDS = 'slug name nameHi category categoryHi description descriptionHi basePrice';

// Get the category list (used by register and profile skill pickers)
router.get('/categories', async (req, res) => {
    try {
        const categories = await Service.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    categoryHi: { $first: '$categoryHi' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, category: '$_id', categoryHi: 1, count: 1 } }
        ]);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all bookable services
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({ isActive: true })
            .select(PUBLIC_FIELDS)
            .sort({ category: 1, basePrice: 1 })
            .lean();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
