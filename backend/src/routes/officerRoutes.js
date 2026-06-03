const express = require('express');
const router = express.Router();
const { 
  getOfficers, 
  getOfficerStats,
  getOfficerDashboard,
  getOfficerIssues,
  updateIssueStatus,
  uploadResolution,
  getOfficerReports,
  getOfficerAnalytics,
} = require('../controllers/officerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);
router.use(authorize('Admin', 'Department Officer'));

router.get('/dashboard', getOfficerDashboard);
router.get('/issues', getOfficerIssues);
router.get('/analytics', getOfficerAnalytics);
router.put('/update-status', updateIssueStatus);
router.post('/upload-resolution', upload.array('resolutionImages', 5), uploadResolution);
router.get('/reports', getOfficerReports);

router.get('/', getOfficers);
router.get('/:id/stats', getOfficerStats);

module.exports = router;
