const express = require('express');
const router = express.Router();
const { 
  supportComplaint, 
  checkSupport, 
  removeSupport, 
  getSupporters 
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');

router.post('/support', protect, supportComplaint);
router.delete('/remove-support', protect, removeSupport);
router.get('/supporters', protect, getSupporters);

router.post('/:id', protect, supportComplaint);
router.get('/:id', protect, checkSupport);

module.exports = router;

module.exports = router;
