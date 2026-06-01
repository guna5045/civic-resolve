const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const complaintRoutes = require('./complaintRoutes');
const departmentRoutes = require('./departmentRoutes');
const officerRoutes = require('./officerRoutes');
const adminRoutes = require('./adminRoutes');
const badgeRoutes = require('./badgeRoutes');
const reportRoutes = require('./reportRoutes');
const notificationRoutes = require('./notificationRoutes');
const supportRoutes = require('./supportRoutes');
const auditLogRoutes = require('./auditLogRoutes');

router.use('/auth', authRoutes);
router.use('/complaints', complaintRoutes);
router.use('/departments', departmentRoutes);
router.use('/officers', officerRoutes);
router.use('/admin', adminRoutes);
router.use('/badges', badgeRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/supports', supportRoutes);
router.use('/audit-logs', auditLogRoutes);

module.exports = router;
