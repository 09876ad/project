const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const WorkerProfile = require('../models/WorkerProfile');
const Service = require('../models/Service');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Only these moves are legal. A job can only be completed after the customer
// approved the quote (status in_progress), so a worker cannot skip the quote.
const ALLOWED_STATUS_TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['cancelled'],
  pending_approval: [],
  in_progress: ['completed'],
  completed: [],
  cancelled: []
};

// Create a new booking
router.post('/', protect, async (req, res) => {
  try {
    const { workerId, serviceId, date, photos } = req.body;

    if (!mongoose.isValidObjectId(workerId) || !mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({ message: 'Invalid worker or service' });
    }

    if (String(workerId) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot book yourself' });
    }

    const scheduledAt = new Date(date);
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }
    if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({ message: 'Booking date cannot be in the past' });
    }

    const [worker, service, workerProfile] = await Promise.all([
      User.findById(workerId).select('role'),
      Service.findById(serviceId).select('_id'),
      WorkerProfile.findOne({ userId: workerId, isVerified: true }).select('_id')
    ]);

    if (!worker || worker.role !== 'worker') {
      return res.status(400).json({ message: 'Selected worker is not available' });
    }
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!workerProfile) {
      return res.status(400).json({ message: 'Selected worker is not verified' });
    }

    const photoList = Array.isArray(photos)
      ? photos.filter((photo) => typeof photo === 'string').slice(0, 10)
      : [];

    // ✅ Diagnostic Fee (Base Price for Inspection)
    const diagnosticFee = 100;

    // Cooperative Pricing Logic (The USP!)
    // Example: 80% to worker, 10% to coop fund, 10% platform fee
    const workerPayout = diagnosticFee * 0.80;
    const cooperativeFundContribution = diagnosticFee * 0.10;
    const platformFee = diagnosticFee * 0.10;

    const booking = await Booking.create({
      customerId: req.user.id,
      workerId,
      serviceId,
      date: scheduledAt,
      totalAmount: diagnosticFee,
      workerPayout,
      cooperativeFundContribution,
      platformFee,
      diagnosticFee,
      amountPaid: diagnosticFee, // Customer pays the diagnostic fee upfront
      status: 'pending',
      photos: photoList
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get bookings for the logged-in customer
router.get('/customer-bookings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const bookings = await Booking.find({ customerId: req.user.id })
      .populate('workerId', 'name phone')
      .populate('serviceId', 'name basePrice')
      .sort({ createdAt: -1 }); // Show newest first
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bookings for the logged-in WORKER
router.get('/worker-bookings', protect, async (req, res) => {
  try {
    // Only workers can access this
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await Booking.find({ workerId: req.user.id })
      .populate('customerId', 'name phone address')
      .populate('serviceId', 'name basePrice')
      .sort({ createdAt: -1 }); // Show newest first

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status (Accept, Complete, etc.)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted', 'completed', 'cancelled'

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }
    if (typeof status !== 'string') {
      return res.status(400).json({ message: 'Status is required' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Ensure only the assigned worker can update their own booking
    if (booking.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change booking from ${booking.status} to ${status}`
      });
    }

    booking.status = status;
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});



// @route   POST /api/bookings/:id/review
// @desc    Customer leaves a review for a completed booking
router.post('/:id/review', protect, async (req, res) => {
  try {
    console.log('Review request received:', req.params.id, req.body); // Debug log

    const { rating, comment } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5' });
    }

    const commentText = typeof comment === 'string' ? comment.trim().slice(0, 1000) : '';

    const booking = await Booking.findById(req.params.id)
      .populate('workerId')
      .populate('serviceId');

    if (!booking) {
      console.log('Booking not found');
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only review your own booking' });
    }

    if (booking.status !== 'completed') {
      console.log('Booking not completed:', booking.status);
      return res.status(400).json({ message: 'Can only review completed jobs' });
    }

    if (booking.isReviewed) {
      console.log('Already reviewed');
      return res.status(400).json({ message: 'You have already reviewed this job' });
    }

    // Find the worker's profile
    const workerProfile = await WorkerProfile.findOne({ userId: booking.workerId._id });
    if (!workerProfile) {
      console.log('Worker profile not found for:', booking.workerId._id);
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    // Add the review
    const customer = await User.findById(req.user.id).select('name');
    workerProfile.reviews.push({
      customerId: req.user.id,
      customerName: customer?.name || '',
      rating: numericRating,
      comment: commentText
    });

    // Update review count and average
    workerProfile.reviewCount += 1;
    const totalRating = workerProfile.reviews.reduce((acc, item) => acc + item.rating, 0);
    workerProfile.rating = totalRating / workerProfile.reviewCount;

    await workerProfile.save();

    // Mark booking as reviewed
    booking.isReviewed = true;
    await booking.save();

    console.log('Review saved successfully');
    res.json({ message: 'Review submitted successfully!', workerProfile });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Worker submits diagnosis and final quote
router.put('/:id/submit-quote', protect, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can submit quotes' });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    const { diagnosis, partsCost } = req.body;

    const diagnosisText = typeof diagnosis === 'string' ? diagnosis.trim() : '';
    if (!diagnosisText || diagnosisText.length > 1000) {
      return res.status(400).json({ message: 'Diagnosis is required (max 1000 characters)' });
    }

    const parsedPartsCost = Number(partsCost ?? 0);
    if (!Number.isFinite(parsedPartsCost) || parsedPartsCost < 0 || parsedPartsCost > 100000) {
      return res.status(400).json({ message: 'Parts cost must be between 0 and 100000' });
    }

    const booking = await Booking.findById(req.params.id).populate('serviceId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only submit a quote for your own booking' });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({ message: 'Accept the booking before submitting a quote' });
    }

    // Calculate final quote: diagnostic fee + parts cost
    const diagnosticFee = booking.diagnosticFee || 100;
    const finalQuoteAmount = diagnosticFee + parsedPartsCost;

    booking.diagnosis = diagnosisText;
    booking.partsCost = parsedPartsCost;
    booking.finalQuoteAmount = finalQuoteAmount;
    booking.status = 'pending_approval'; // Change status to await customer approval
    booking.quoteApproved = false;

    await booking.save();

    res.json({ message: 'Quote submitted successfully', booking });
  } catch (error) {
    console.error('Submit quote error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Customer approves or declines the quote
router.put('/:id/approve-quote', protect, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can approve quotes' });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    const { approved } = req.body; // true = approve, false = decline
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ message: 'approved must be true or false' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only approve your own booking quote' });
    }

    if (booking.status !== 'pending_approval' || booking.quoteApproved) {
      return res.status(400).json({ message: 'No quote is awaiting approval' });
    }

    if (!booking.finalQuoteAmount || booking.finalQuoteAmount <= 0) {
      return res.status(400).json({ message: 'Quote amount is invalid' });
    }

    if (approved) {
      // Customer approved - ADD the parts cost split to existing amounts
      booking.quoteApproved = true;
      booking.status = 'in_progress';

      // Update to final quote amount
      booking.totalAmount = booking.finalQuoteAmount;

      // Recalculate 80:10:10 split on FINAL total
      booking.workerPayout = booking.finalQuoteAmount * 0.80;
      booking.cooperativeFundContribution = booking.finalQuoteAmount * 0.10;
      booking.platformFee = booking.finalQuoteAmount * 0.10;

      // amountPaid stays the same (customer already paid diagnostic fee)
      // Customer will pay REMAINING: finalQuoteAmount - amountPaid

    } else {
      // Customer declined - charge only diagnostic fee (already recorded at booking)
      booking.status = 'cancelled';
      // Keep the original diagnostic fee split (don't change it)
      booking.totalAmount = booking.diagnosticFee;

      // Worker keeps 80% of diagnostic fee (already calculated)
      // No recalculation needed - workerPayout is already 80% of diagnosticFee
      booking.workerPayout = booking.diagnosticFee * 0.80;
      booking.cooperativeFundContribution = booking.diagnosticFee * 0.10;
      booking.platformFee = booking.diagnosticFee * 0.10;
    }

    await booking.save();
    res.json({
       message: approved 
        ? 'Quote approved! Worker will proceed.' 
        : 'Quote declined. Only diagnostic fee charged.', 
      booking 
    });
  } catch (error) {
    console.error('Approve quote error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;