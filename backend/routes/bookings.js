const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Create a new booking
router.post('/', protect, async (req, res) => {
  try {
    const { workerId, serviceId, date, totalAmount, photos } = req.body;

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
      date,
      totalAmount: diagnosticFee,
      workerPayout,
      cooperativeFundContribution,
      platformFee,
      diagnosticFee,
      amountPaid: diagnosticFee, // Customer pays the diagnostic fee upfront
      status: 'pending',
      photos: photos || []  // Store photos if provided
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
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Ensure only the assigned worker can update their own booking
    if (booking.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
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
      rating: Number(rating),
      comment: comment || ''
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

    const { diagnosis, partsCost } = req.body;
    const booking = await Booking.findById(req.params.id).populate('serviceId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only submit a quote for your own booking' });
    }

    // Calculate final quote: diagnostic fee + parts cost
    const diagnosticFee = booking.diagnosticFee || 100;
    const finalQuoteAmount = diagnosticFee + (partsCost || 0);

    booking.diagnosis = diagnosis;
    booking.partsCost = partsCost || 0;
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

    const { approved } = req.body; // true = approve, false = decline
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only approve your own booking quote' });
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