const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, authorize('Admin'), getAuditLogs);

module.exports = router;
