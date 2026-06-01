const express = require('express');
const router = express.Router();
const { exportExcel, exportPDF, getReportsMetadata } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/excel', protect, authorize('Admin', 'Department Officer'), exportExcel);
router.get('/pdf/:complaintId', protect, exportPDF);
router.get('/', protect, authorize('Admin'), getReportsMetadata);

module.exports = router;
