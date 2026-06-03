const express = require('express');
const router = express.Router();
const { checkAIStatus, analyzeText } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/health', protect, authorize('Admin'), checkAIStatus);
router.post('/analyze', protect, authorize('Admin', 'Citizen'), analyzeText);

module.exports = router;
