const express = require('express');
const router = express.Router();
const { exportExcel, exportPDF, exportPDFSummary, getReportsMetadata } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/excel', protect, authorize('Admin', 'Department Officer'), exportExcel);
router.get('/pdf-summary', protect, authorize('Admin', 'Department Officer'), exportPDFSummary);
router.get('/pdf/:complaintId', protect, exportPDF);
router.get('/', protect, authorize('Admin'), getReportsMetadata);

module.exports = router;
