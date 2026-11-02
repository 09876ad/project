const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const { protect } = require('../middleware/authMiddleware');
const { rateLimit } = require('../middleware/rateLimit');
const { resolveSkills } = require('../lib/catalog');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many login attempts. Please try again in 15 minutes.'
});
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many accounts created from this network. Please try again later.'
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrationError({ name, email, password, phone }) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
        return 'Name must be between 2 and 80 characters';
    }
    if (typeof email !== 'string' || email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
        return 'A valid email is required';
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return 'Password must be between 8 and 128 characters';
    }
    if (phone && (typeof phone !== 'string' || !/^\d{10}$/.test(phone))) {
        return 'Phone must be a 10-digit number';
    }
    return null;
}

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { name, email, password, role, phone, address } = req.body;
        const finalRole = role === 'worker' ? 'worker' : 'customer';

        const invalid = registrationError({ name, email, password, phone });
        if (invalid) {
            return res.status(400).json({ message: invalid });
        }

        const normalizedEmail = email.trim();

        let workerSkills = [];
        if (finalRole === 'worker') {
            const provided = Array.isArray(req.body.skills) ? req.body.skills.slice(0, 20) : [];
            const { resolved, unknown } = await resolveSkills(provided);
            if (unknown.length > 0) {
                return res.status(400).json({ message: `Unknown service category: ${unknown[0]}` });
            }
            workerSkills = resolved;
        }

        // 1. Check if user already exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create User
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: finalRole,
            phone,
            address
        });

        // 4. If user is a worker, create an empty WorkerProfile for them
        if (user.role === 'worker') {
            await WorkerProfile.create({
                userId: user._id,
                skills: workerSkills,
                experience: 0,
                isVerified: false,
                insuranceStatus: 'Pending',
                cooperativeFundBalance: 0
            });
        }

        // 5. Generate JWT Token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // 1. Check for user email
        const user = await User.findOne({ email: email.trim() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // 2. Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // 3. Generate JWT Token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user (Protected Route)
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;