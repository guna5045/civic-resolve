const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  getNearbyComplaints,
  updateComplaintStatus,
} = require('../controllers/complaintController');
const { supportComplaint, checkSupport } = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public or generic protected endpoints
router.get('/', protect, getComplaints);
router.get('/all', protect, getComplaints);
router.get('/nearby', protect, getNearbyComplaints);

// Scoped queries
router.get('/my-complaints', protect, async (req, res, next) => {
  req.query.citizen = req.user._id;
  getComplaints(req, res, next);
});

router.get('/supported-complaints', protect, async (req, res, next) => {
  try {
    const Support = require('../models/Support');
    const userSupports = await Support.find({ user: req.user._id }).select('complaint');
    const supportedIds = userSupports.map(s => s.complaint);
    req.query._id = { $in: supportedIds };
    getComplaints(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', protect, getComplaintById);

// Citizen actions
router.post('/', protect, authorize('Citizen'), upload.array('images', 5), createComplaint);
router.post('/create', protect, authorize('Citizen'), upload.array('images', 5), createComplaint);
router.post('/:id/support', protect, authorize('Citizen'), supportComplaint);
router.get('/:id/supported', protect, checkSupport);

// Officer/Admin actions
router.patch(
  '/:id/status',
  protect,
  authorize('Department Officer', 'Admin'),
  upload.array('resolutionImages', 5),
  updateComplaintStatus
);

router.put(
  '/update/:id',
  protect,
  authorize('Department Officer', 'Admin'),
  upload.array('resolutionImages', 5),
  updateComplaintStatus
);

router.put(
  '/update',
  protect,
  authorize('Department Officer', 'Admin'),
  upload.array('resolutionImages', 5),
  updateComplaintStatus
);

router.delete('/delete/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const Complaint = require('../models/Complaint');
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/delete', protect, authorize('Admin'), async (req, res) => {
  try {
    const Complaint = require('../models/Complaint');
    await Complaint.findByIdAndDelete(req.body.id);
    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
