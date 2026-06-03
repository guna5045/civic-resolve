const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Badge = require('../models/Badge');
const bcrypt = require('bcryptjs');

/**
 * @desc    Create a new Department Officer
 * @route   POST /api/admin/officers
 * @access  Private (Admin only)
 */
const createOfficer = async (req, res) => {
  const { fullName, email, mobile, password, departmentId } = req.body;

  try {
    const officerExists = await User.findOne({ email });
    if (officerExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email/ID' });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const officer = await User.create({
      fullName,
      email, // acting as Officer ID
      mobile,
      passwordHash: password, // Pre-save hook in User model will hash this automatically exactly once
      role: 'Department Officer',
      department: departmentId,
      departmentName: department.name,
      status: 'Active',
    });

    // Write to Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Officer Added',
      module: 'User Management',
      description: `Created new Department Officer: ${fullName} (${email}) for department ${department.name}`,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: officer._id,
        fullName: officer.fullName,
        email: officer.email,
        role: officer.role,
        department: officer.department,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get dashboard analytics / city overview stats
 * @route   GET /api/admin/analytics
 * @access  Private (Admin only)
 */
const getAdminAnalytics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments({});
    
    // Status metrics
    const pendingReview = await Complaint.countDocuments({ status: { $in: ['Submitted', 'Under Review', 'Information Clarified'] } });
    const assigned = await Complaint.countDocuments({ status: 'Assigned' });
    const inProgress = await Complaint.countDocuments({ status: { $in: ['Verified', 'Verified By Officer', 'Work Started'] } });
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const closed = await Complaint.countDocuments({ status: 'Closed' });
    const rejected = await Complaint.countDocuments({ status: 'Rejected' });
    const clarificationRequired = await Complaint.countDocuments({ status: 'Clarification Required' });

    // Entity counters
    const totalCitizens = await User.countDocuments({ role: 'Citizen' });
    const activeOfficers = await User.countDocuments({ role: 'Department Officer', status: 'Active' });
    const totalOfficers = await User.countDocuments({ role: 'Department Officer' });
    const totalDepartments = await Department.countDocuments({});

    // Category breakdown
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Priority breakdown
    const priorityStats = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Department-wise breakdown
    const departmentStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'departmentDetails',
        },
      },
      { $unwind: '$departmentDetails' },
      {
        $project: {
          name: '$departmentDetails.name',
          count: 1,
          resolved: 1,
        },
      },
    ]);

    // Recent Complaint Activity (last 5 complaints)
    const recentComplaintActivity = await Complaint.find({})
      .populate('citizen', 'fullName email')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent Assignment Activity (last 5 assigned complaints)
    const recentAssignmentActivity = await Complaint.find({ status: 'Assigned' })
      .populate('citizen', 'fullName email')
      .populate('assignedOfficer', 'fullName email')
      .populate('department', 'name')
      .sort({ assignmentTimestamp: -1, updatedAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        complaints: {
          total: totalComplaints,
          pendingReview,
          assigned,
          inProgress,
          resolved,
          closed,
          rejected,
          clarificationRequired,
        },
        users: {
          citizens: totalCitizens,
          activeOfficers,
          totalOfficers,
          departments: totalDepartments,
        },
        categoryStats,
        priorityStats,
        departmentStats,
        recentComplaintActivity,
        recentAssignmentActivity,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Assign or swap officer for a complaint
 * @route   PATCH /api/admin/complaints/:id/assign
 * @access  Private (Admin only)
 */
const assignComplaint = async (req, res) => {
  const { officerId, departmentId, priority } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    let descriptionParts = [];

    // 1. Department Assignment
    if (departmentId && departmentId !== String(complaint.department)) {
      complaint.department = departmentId;
      descriptionParts.push(`department changed`);

      const department = await Department.findById(departmentId);
      const deptName = department ? department.name : 'Unknown Department';

      // Audit Log for Department Assigned
      await AuditLog.create({
        user: req.user._id,
        action: 'Department Assigned',
        module: 'Complaints',
        description: `Assigned department ${deptName} to complaint ID: ${complaint.complaintId}`,
      });

      // Citizen notification for department change
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Department Assigned',
        message: `Your complaint "${complaint.title}" has been assigned to the ${deptName}.`,
        type: 'Complaint Status',
      });
    }

    // 2. Officer Assignment
    if (officerId) {
      const officer = await User.findById(officerId);
      if (!officer || officer.role !== 'Department Officer') {
        return res.status(400).json({ success: false, message: 'Invalid officer assignment' });
      }

      const prevOfficerId = complaint.assignedOfficer;
      if (prevOfficerId && String(prevOfficerId) !== String(officerId)) {
        await Notification.create({
          recipient: prevOfficerId,
          title: 'Assignment Reassigned',
          message: `You have been unassigned from complaint: ${complaint.complaintId}. It has been reassigned to another officer.`,
          type: 'Officer Assignment',
        });
      }

      complaint.assignedOfficer = officerId;
      complaint.status = 'Assigned';
      complaint.assignmentTimestamp = new Date();
      complaint.assignedByAdmin = req.user._id;
      descriptionParts.push(`assigned to officer ${officer.fullName}`);

      // Audit Log for Officer Assigned
      await AuditLog.create({
        user: req.user._id,
        action: 'Officer Assigned',
        module: 'Complaints',
        description: `Assigned officer ${officer.fullName} to complaint ID: ${complaint.complaintId}`,
      });

      // Notify the officer
      await Notification.create({
        recipient: officerId,
        title: 'New Complaint Assigned',
        message: `You have been assigned to complaint: ${complaint.complaintId} (${complaint.title})`,
        type: 'Officer Assignment',
      });

      // Notify the citizen
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Officer Assigned',
        message: `Officer ${officer.fullName} has been assigned to resolve your complaint "${complaint.title}".`,
        type: 'Complaint Status',
      });
    }

    if (priority) {
      complaint.priority = priority;
      descriptionParts.push(`priority updated to ${priority}`);
    }

    const changeDescription = descriptionParts.length > 0 ? descriptionParts.join(', ') : 'Details modified';

    // Update timeline
    complaint.timeline.push({
      status: complaint.status,
      title: 'Administrative Reassignment',
      description: `Complaint reassigned/modified by Admin: ${changeDescription}.`,
      updatedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();

    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin only)
 */
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .populate('user', 'fullName email role')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Admin reviews complaint initially (changes status to Under Review)
 * @route   PATCH /api/admin/complaints/:id/review
 */
const reviewComplaint = async (req, res) => {
  const { decision, remarks } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (decision === 'Approve') {
      complaint.status = 'Under Review';
      complaint.timeline.push({
        status: 'Under Review',
        title: 'Complaint Approved',
        description: 'Complaint approved and moved to department queue for assignment.',
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      // Write Audit Log
      await AuditLog.create({
        user: req.user._id,
        action: 'Complaint Approved',
        module: 'Complaints',
        description: `Approved complaint ID: ${complaint.complaintId}`,
      });

      // Notify citizen
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Complaint Approved',
        message: `Your complaint "${complaint.title}" has been approved by administration.`,
        type: 'Complaint Status',
      });

    } else if (decision === 'Reject') {
      if (!remarks || !remarks.trim()) {
        return res.status(400).json({ success: false, message: 'Rejection remarks are required' });
      }
      complaint.status = 'Rejected';
      complaint.adminRemarks = remarks;
      complaint.timeline.push({
        status: 'Rejected',
        title: 'Complaint Rejected',
        description: `Complaint rejected by Admin. Reason: "${remarks}"`,
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      // Write Audit Log
      await AuditLog.create({
        user: req.user._id,
        action: 'Complaint Rejected',
        module: 'Complaints',
        description: `Rejected complaint ID: ${complaint.complaintId}. Reason: ${remarks}`,
      });

      // Notify citizen
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Complaint Rejected',
        message: `Your complaint "${complaint.title}" was rejected. Reason: ${remarks}`,
        type: 'Complaint Status',
      });

    } else if (decision === 'Request Clarification') {
      if (!remarks || !remarks.trim()) {
        return res.status(400).json({ success: false, message: 'Clarification details are required' });
      }
      complaint.status = 'Clarification Required';
      complaint.adminRemarks = remarks;
      complaint.timeline.push({
        status: 'Clarification Required',
        title: 'Clarification Requested',
        description: `Admin requested clarification. Note: "${remarks}"`,
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      // Write Audit Log
      await AuditLog.create({
        user: req.user._id,
        action: 'Request Clarification',
        module: 'Complaints',
        description: `Requested clarification for complaint ID: ${complaint.complaintId}. Request: ${remarks}`,
      });

      // Notify citizen
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Clarification Required',
        message: `Clarification requested for your complaint "${complaint.title}". Detail: ${remarks}`,
        type: 'Complaint Status',
      });

    } else {
      // Fallback
      complaint.status = 'Under Review';
      complaint.timeline.push({
        status: 'Under Review',
        title: 'Under Review',
        description: 'Complaint details are currently under review by municipal administration.',
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      await AuditLog.create({
        user: req.user._id,
        action: 'Review Complaint',
        module: 'Complaints',
        description: `Set complaint ID: ${complaint.complaintId} status to Under Review.`,
      });
    }

    await complaint.save();
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Admin reviews officer completed resolution
 * @route   PATCH /api/admin/complaints/:id/resolve-review
 */
const reviewResolution = async (req, res) => {
  const { decision, remarks, correctionsRequired, reasonForReturn } = req.body; // decision: 'Accept' or 'Reject'

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const previousStatus = complaint.status;

    if (decision === 'Accept') {
      complaint.status = 'Closed';
      const isRejection = previousStatus === 'Rejected By Officer';
      complaint.timeline.push({
        status: 'Closed',
        title: isRejection ? 'Officer Rejection Approved' : 'Complaint Closed',
        description: isRejection 
          ? "Administration approved the officer's rejection. Complaint marked as Closed."
          : 'Administration accepted resolution proof. Complaint marked as Closed.',
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      if (!isRejection) {
        // Reward points: 30 Points on resolution
        await User.findByIdAndUpdate(complaint.citizen, {
          $inc: { points: 30 },
        });
      }

      // Notify citizen
      await Notification.create({
        recipient: complaint.citizen,
        title: isRejection ? 'Complaint Closed (Rejection Approved)' : 'Complaint Closed Successfully',
        message: isRejection
          ? `Your complaint "${complaint.title}" has been closed based on officer inspection. Reason: ${complaint.rejectionReason}`
          : `Your complaint "${complaint.title}" has been successfully resolved and closed. Earned +30 XP!`,
        type: 'Complaint Status',
      });
    } else {
      // Reject and send back to assigned officer in Work Started status
      complaint.status = 'Work Started';
      complaint.adminRemarks = remarks || 'Resolution proof rejected. Please review again.';
      complaint.correctionsRequired = correctionsRequired || '';
      complaint.reasonForReturn = reasonForReturn || '';
      
      complaint.timeline.push({
        status: 'Work Started',
        title: 'Resolution Returned',
        description: `Resolution proof returned by Admin. Reason: "${reasonForReturn || 'Re-work required.'}". Remarks: "${remarks || 'Re-work required.'}"`,
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      // Notify assigned officer
      if (complaint.assignedOfficer) {
        await Notification.create({
          recipient: complaint.assignedOfficer,
          title: 'Complaint Returned By Admin ⚠️',
          message: `Complaint returned by Admin. Reason: ${reasonForReturn || 'Re-work required.'}. Remarks: ${remarks || 'Re-work required.'}. Corrections Required: ${correctionsRequired || 'None'}`,
          type: 'System Alert',
        });
      }

      // Notify citizen
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Complaint Returned to Officer',
        message: `Your complaint has been returned to the officer for corrections.`,
        type: 'Complaint Status',
      });
    }

    await complaint.save();

    // Write Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Review Resolution',
      module: 'Complaints',
      description: `Resolution review for ID: ${complaint.complaintId} was completed with decision: ${decision}.`,
    });

    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Toggle Suspension status of an officer
 * @route   PATCH /api/admin/officers/:id/suspend
 */
const suspendOfficer = async (req, res) => {
  try {
    const officer = await User.findById(req.params.id);
    if (!officer || officer.role !== 'Department Officer') {
      return res.status(404).json({ success: false, message: 'Officer profile not found.' });
    }

    officer.status = officer.status === 'Suspended' ? 'Active' : 'Suspended';
    await officer.save();

    // Write Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Suspend Officer',
      module: 'User Management',
      description: `Toggled officer ${officer.fullName} status to: ${officer.status}.`,
    });

    res.json({ success: true, data: officer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Edit details of an existing officer
 * @route   PUT /api/admin/officers/:id
 */
const editOfficer = async (req, res) => {
  const { fullName, email, mobile, departmentId } = req.body;

  try {
    const officer = await User.findById(req.params.id);
    if (!officer || officer.role !== 'Department Officer') {
      return res.status(404).json({ success: false, message: 'Officer profile not found.' });
    }

    officer.fullName = fullName || officer.fullName;
    officer.email = email || officer.email;
    officer.mobile = mobile || officer.mobile;
    
    let isTransfer = false;
    let oldDeptName = officer.departmentName || 'No Department';
    let newDeptName = '';

    if (departmentId && String(departmentId) !== String(officer.department)) {
      const department = await Department.findById(departmentId);
      if (department) {
        officer.department = departmentId;
        officer.departmentName = department.name;
        newDeptName = department.name;
        isTransfer = true;
      }
    }

    await officer.save();

    // Write Audit Log
    if (isTransfer) {
      await AuditLog.create({
        user: req.user._id,
        action: 'Officer Transferred',
        module: 'User Management',
        description: `Transferred officer ${officer.fullName} (${officer.email}) from ${oldDeptName} to ${newDeptName}.`,
      });
    } else {
      await AuditLog.create({
        user: req.user._id,
        action: 'Edit Officer',
        module: 'User Management',
        description: `Modified details for officer ${officer.fullName} (${officer.email}).`,
      });
    }

    res.json({ success: true, data: officer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Reset password/credentials for an officer
 * @route   PATCH /api/admin/officers/:id/reset-password
 */
const resetOfficerPassword = async (req, res) => {
  const { password } = req.body;

  try {
    const officer = await User.findById(req.params.id);
    if (!officer || officer.role !== 'Department Officer') {
      return res.status(404).json({ success: false, message: 'Officer profile not found.' });
    }

    officer.passwordHash = password; // Pre-save hook in User model will hash this automatically exactly once
    await officer.save();

    // Write Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Reset Password',
      module: 'User Management',
      description: `Reset password credentials for officer ${officer.fullName}.`,
    });

    res.json({ success: true, message: 'Officer credentials reset successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Escalation desk queues (Pending > 15/30 Days, Critical Unassigned)
 * @route   GET /api/admin/escalations
 */
const getEscalations = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pending15: [],
        pending30: [],
        criticalUnassigned: [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create custom reward badge
 * @route   POST /api/admin/badges
 */
const createBadge = async (req, res) => {
  const { name, description, icon, requirement, pointsReward, isSeasonal, seasonalMonth } = req.body;
  try {
    const badge = await Badge.create({
      name,
      description,
      icon,
      requirement,
      pointsReward,
      isSeasonal,
      seasonalMonth,
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'Create Badge',
      module: 'Rewards Config',
      description: `Created new badge reward: "${name}" (+${pointsReward} XP).`,
    });

    res.status(201).json({ success: true, data: badge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Edit custom reward badge
 * @route   PUT /api/admin/badges/:id
 */
const editBadge = async (req, res) => {
  const { name, description, icon, requirement, pointsReward, isSeasonal, seasonalMonth, isActive } = req.body;
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });

    badge.name = name || badge.name;
    badge.description = description || badge.description;
    badge.icon = icon || badge.icon;
    badge.requirement = requirement || badge.requirement;
    if (pointsReward !== undefined) badge.pointsReward = pointsReward;
    if (isSeasonal !== undefined) badge.isSeasonal = isSeasonal;
    if (seasonalMonth !== undefined) badge.seasonalMonth = seasonalMonth;
    if (isActive !== undefined) badge.isActive = isActive;

    await badge.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'Edit Badge',
      module: 'Rewards Config',
      description: `Modified parameters for badge: "${badge.name}".`,
    });

    res.json({ success: true, data: badge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// System settings cache
const systemSettings = require('../config/systemSettings');

const getSystemSettings = async (req, res) => {
  res.json({ success: true, data: systemSettings });
};

const updateSystemSettings = async (req, res) => {
  // Update the shared settings in-place
  Object.assign(systemSettings, req.body);
  await AuditLog.create({
    user: req.user._id,
    action: 'Update Settings',
    module: 'System Configuration',
    description: 'Updated system parameters and configuration boundaries.',
  });
  res.json({ success: true, data: systemSettings });
};

module.exports = {
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
};
