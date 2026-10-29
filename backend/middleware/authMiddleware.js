const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (req, res, next) => {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (e.g., "Bearer eyJhbGciOi...")
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user info to request object (excluding password)
            req.user = decoded;
            return next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const adminOnly = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('role');
        if (user && user.role === 'admin') {
            return next();
        }
        return res.status(403).json({ message: 'Not authorized as an admin' });
    } catch (error) {
        return res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, adminOnly };