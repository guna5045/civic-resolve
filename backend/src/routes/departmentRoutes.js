const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment, updateDepartment, getDepartmentStats } = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getDepartments);
router.get('/:id/stats', protect, authorize('Admin'), getDepartmentStats);
router.post('/', protect, authorize('Admin'), createDepartment);
router.put('/:id', protect, authorize('Admin'), updateDepartment);

module.exports = router;
