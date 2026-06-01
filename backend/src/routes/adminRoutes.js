const express = require('express');
const router = express.Router();
const {
  createOfficer,
  getAdminAnalytics,
  assignComplaint,
  getAuditLogs,
  reviewComplaint,
  reviewResolution,
  suspendOfficer,
  editOfficer,
  resetOfficerPassword,
  getEscalations,
  createBadge,
  editBadge,
  getSystemSettings,
  updateSystemSettings,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('Admin'));

router.post('/officers', createOfficer);
router.put('/officers/:id', editOfficer);
router.patch('/officers/:id/suspend', suspendOfficer);
router.patch('/officers/:id/reset-password', resetOfficerPassword);

router.get('/analytics', getAdminAnalytics);
router.get('/escalations', getEscalations);

router.patch('/complaints/:id/review', reviewComplaint);
router.patch('/complaints/:id/assign', assignComplaint);
router.patch('/complaints/:id/resolve-review', reviewResolution);

router.post('/badges', createBadge);
router.put('/badges/:id', editBadge);

router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

router.get('/audit-logs', getAuditLogs);

module.exports = router;
