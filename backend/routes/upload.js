const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MULTER_MESSAGE = 'Upload must be a JPEG, PNG or WebP image up to 5MB';

// The browser-supplied MIME type is trivially spoofed, so confirm the actual
// bytes before handing the buffer to Cloudinary.
function detectImageType(buffer) {
    if (!buffer || buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    return null;
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(MULTER_MESSAGE), false);
        }
    }
});

// Upload single image
router.post('/image', protect, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const detectedType = detectImageType(req.file.buffer);
        if (!detectedType) {
            return res.status(400).json({ message: MULTER_MESSAGE });
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = 'data:' + detectedType + ';base64,' + b64;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'coopgig_bookings',
            width: 800,
            crop: 'scale'
        });

        res.json({
            success: true,
            url: result.secure_url,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

router.use((error, req, res, next) => {
    if (!error) return next();
    res.status(400).json({ message: MULTER_MESSAGE });
});

module.exports = router;
