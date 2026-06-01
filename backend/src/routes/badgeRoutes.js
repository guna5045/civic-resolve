const express = require('express');
const router = express.Router();
const { getBadges, evaluateBadges } = require('../controllers/badgeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, getBadges);
router.post('/evaluate', protect, authorize('Citizen'), evaluateBadges);

module.exports = router;
