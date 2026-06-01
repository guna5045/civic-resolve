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

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const officer = await User.create({
      fullName,
      email, // acting as Officer ID
      mobile,
      passwordHash,
      role: 'Department Officer',
      department: departmentId,
      status: 'Active',
    });

    // Write to Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Create Officer',
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
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const reported = await Complaint.countDocuments({ status: 'Reported' });
    const escalated = await Complaint.countDocuments({ status: 'Escalated' });
    const rejected = await Complaint.countDocuments({ status: 'Rejected' });

    const totalCitizens = await User.countDocuments({ role: 'Citizen' });
    const totalOfficers = await User.countDocuments({ role: 'Department Officer' });

    // Category breakdown
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
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

    res.json({
      success: true,
      data: {
        complaints: {
          total: totalComplaints,
          resolved,
          inProgress,
          reported,
          escalated,
          rejected,
        },
        users: {
          citizens: totalCitizens,
          officers: totalOfficers,
        },
        categoryStats,
        departmentStats,
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

    if (departmentId && departmentId !== String(complaint.department)) {
      complaint.department = departmentId;
      descriptionParts.push(`department changed`);
    }

    if (officerId) {
      const officer = await User.findById(officerId);
      if (!officer || officer.role !== 'Department Officer') {
        return res.status(400).json({ success: false, message: 'Invalid officer assignment' });
      }
      complaint.assignedOfficer = officerId;
      complaint.status = 'Assigned';
      descriptionParts.push(`assigned to officer ${officer.fullName}`);

      // Notify the officer
      await Notification.create({
        recipient: officerId,
        title: 'New Complaint Assigned',
        message: `You have been assigned to complaint: ${complaint.complaintId} (${complaint.title})`,
        type: 'Officer Assignment',
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

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Assign Complaint',
      module: 'Complaints Management',
      description: `Reassigned complaint ID: ${complaint.complaintId} (${changeDescription})`,
    });

    // Notify Citizen
    await Notification.create({
      recipient: complaint.citizen,
      title: 'Complaint Update',
      message: `Your complaint ${complaint.complaintId} details were updated by admin. Status: ${complaint.status}.`,
      type: 'Complaint Status',
    });

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
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    
    complaint.status = 'Under Review';
    complaint.timeline.push({
      status: 'Under Review',
      title: 'Under Review',
      description: 'Complaint details are currently under review by municipal administration.',
      updatedBy: req.user._id,
      timestamp: new Date(),
    });
    
    await complaint.save();
    
    // Write Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Review Complaint',
      module: 'Complaints',
      description: `Set complaint ID: ${complaint.complaintId} status to Under Review.`,
    });

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
  const { decision, remarks } = req.body; // decision: 'Accept' or 'Reject'

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (decision === 'Accept') {
      complaint.status = 'Closed';
      complaint.timeline.push({
        status: 'Closed',
        title: 'Resolution Accepted',
        description: 'Administration accepted resolution proof. Complaint marked as Closed.',
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      // Reward points: 30 Points on resolution
      await User.findByIdAndUpdate(complaint.citizen, {
        $inc: { points: 30 },
      });

      // Notify citizen
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Complaint Resolved & Closed! 🎉',
        message: `Your complaint "${complaint.title}" has been successfully resolved and closed. Earned +30 XP!`,
        type: 'Complaint Status',
      });
    } else {
      // Reject and send back to assigned officer
      complaint.status = 'Assigned';
      complaint.adminRemarks = remarks || 'Resolution proof rejected. Please review again.';
      
      complaint.timeline.push({
        status: 'Assigned',
        title: 'Resolution Rejected',
        description: `Resolution rejected by Admin. Remarks: "${remarks || 'Re-inspection required.'}". returned to department queue.`,
        updatedBy: req.user._id,
        timestamp: new Date(),
      });

      // Notify assigned officer
      if (complaint.assignedOfficer) {
        await Notification.create({
          recipient: complaint.assignedOfficer,
          title: 'Resolution Proof Rejected ⚠️',
          message: `Resolution for complaint ID: ${complaint.complaintId} was rejected. Remarks: "${remarks || 'Re-inspection required.'}"`,
          type: 'System Alert',
        });
      }
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
    
    if (departmentId) {
      const department = await Department.findById(departmentId);
      if (department) {
        officer.department = departmentId;
      }
    }

    await officer.save();

    // Write Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Edit Officer',
      module: 'User Management',
      description: `Modified details for officer ${officer.fullName} (${officer.email}).`,
    });

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

    const salt = await bcrypt.genSalt(10);
    officer.passwordHash = await bcrypt.hash(password, salt);
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
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Pending > 15 Days
    const pending15 = await Complaint.find({
      status: { $in: ['Submitted', 'Under Review', 'Assigned', 'In Progress'] },
      createdAt: { $lte: fifteenDaysAgo, $gt: thirtyDaysAgo },
    })
      .populate('citizen', 'fullName email')
      .populate('department', 'name');

    // Pending > 30 Days
    const pending30 = await Complaint.find({
      status: { $in: ['Submitted', 'Under Review', 'Assigned', 'In Progress'] },
      createdAt: { $lte: thirtyDaysAgo },
    })
      .populate('citizen', 'fullName email')
      .populate('department', 'name');

    // Critical unassigned
    const criticalUnassigned = await Complaint.find({
      priority: 'Critical',
      assignedOfficer: null,
    })
      .populate('citizen', 'fullName email')
      .populate('department', 'name');

    res.json({
      success: true,
      data: {
        pending15,
        pending30,
        criticalUnassigned,
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
  const { name, description, icon, requirement, pointsReward, isSeasonal, seasonalMonth } = req.body;
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
let systemSettings = {
  supportRadiusMeters: 100,
  escalationRulesDays: 15,
  pointValues: { report: 20, support: 5, resolved: 30 },
};

const getSystemSettings = async (req, res) => {
  res.json({ success: true, data: systemSettings });
};

const updateSystemSettings = async (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
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
