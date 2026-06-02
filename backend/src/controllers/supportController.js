const Support = require('../models/Support');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const getLevelFromPoints = (points) => {
  if (points >= 1000) return 5;
  if (points >= 600) return 4;
  if (points >= 300) return 3;
  if (points >= 100) return 2;
  return 1;
};

/**
 * @desc    Support / Upvote a complaint
 * @route   POST /api/complaints/:id/support
 * @access  Private (Citizen only)
 */
const supportComplaint = async (req, res) => {
  const complaintId = req.params.id || req.body.complaintId;
  const userId = req.user._id;

  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (String(complaint.citizen) === String(userId)) {
      return res.status(400).json({ success: false, message: 'You cannot support your own complaint' });
    }

    // Check if already supported
    const alreadySupported = await Support.findOne({ user: userId, complaint: complaintId });
    if (alreadySupported) {
      return res.status(400).json({ success: false, message: 'You are already supporting this complaint' });
    }

    // Create Support entry
    await Support.create({ user: userId, complaint: complaintId });

    // Increment complaint support count
    complaint.supportCount = (complaint.supportCount || 0) + 1;

    // Auto priority escalation at threshold of 5 upvotes
    if (complaint.supportCount >= 5 && (complaint.priority === 'Low' || complaint.priority === 'Medium')) {
      const oldPriority = complaint.priority;
      complaint.priority = 'High';
      complaint.timeline.push({
        status: complaint.status,
        title: 'Priority Escalated',
        description: `Priority automatically escalated from ${oldPriority} to High due to community upvotes (Threshold: 5 upvotes reached).`,
        timestamp: new Date(),
      });
      await Notification.create({
        recipient: complaint.citizen,
        title: 'Issue Priority Escalated 🚀',
        message: `Your complaint "${complaint.title}" has been escalated to High priority due to community support!`,
        type: 'Complaint Status',
      });
    }

    await complaint.save();

    // Reward points to citizen supporting: 5 points
    const user = await User.findById(userId);
    const originalLevel = user.level;
    user.points += 5;
    user.level = getLevelFromPoints(user.points);
    await user.save();

    // Create system notification for supporting citizen
    await Notification.create({
      recipient: userId,
      title: 'XP Earned! 🌟',
      message: `You earned +5 XP for supporting the complaint: "${complaint.title}".`,
      type: 'Points Added',
    });

    // Notify original reporter
    await Notification.create({
      recipient: complaint.citizen,
      title: 'New Support for Your Issue',
      message: `Another citizen has supported your issue "${complaint.title}". Support Count: ${complaint.supportCount}`,
      type: 'Complaint Status',
    });

    // Check Officer Escalation alert: crossed 50 supports
    if (complaint.supportCount >= 50 && complaint.assignedOfficer) {
      await Notification.create({
        recipient: complaint.assignedOfficer,
        title: 'High Support Alert ⚠️',
        message: `Complaint ID: ${complaint.complaintId} has crossed 50 supports. Action recommended.`,
        type: 'System Alert',
      });
    }

    // Unlocked notifications if level changed
    if (user.level !== originalLevel) {
      await Notification.create({
        recipient: userId,
        title: 'Level Up Alert! 📈',
        message: `Congratulations! Your civic reputation level has increased to Level ${user.level}.`,
        type: 'Points Added',
      });
    }

    // Write to Audit Log
    await AuditLog.create({
      user: userId,
      action: 'Support Issue',
      module: 'Complaints',
      description: `Supported complaint ID: ${complaint.complaintId}. Total upvotes: ${complaint.supportCount}.`,
    }).catch(e => console.error('Audit Log failed:', e));

    res.json({
      success: true,
      message: 'Complaint supported successfully',
      supportCount: complaint.supportCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You are already supporting this complaint' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get if user supports this complaint
 * @route   GET /api/complaints/:id/supported
 * @access  Private
 */
const checkSupport = async (req, res) => {
  try {
    const supported = await Support.exists({ user: req.user._id, complaint: req.params.id });
    res.json({ success: true, supported: !!supported });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove support / Upvote from a complaint
 * @route   DELETE /api/supports/remove-support
 */
const removeSupport = async (req, res) => {
  const complaintId = req.body.complaintId || req.query.complaintId || req.params.id;
  const userId = req.user._id;

  try {
    const { removeSupport: deleteSupport } = require('../services/supportService');
    const complaint = await deleteSupport(userId, complaintId);

    // Audit log
    await AuditLog.create({
      user: userId,
      action: 'Remove Support',
      module: 'Complaints',
      description: `Removed support from complaint ID: ${complaint.complaintId}.`,
    }).catch(e => console.error(e));

    res.json({
      success: true,
      message: 'Support removed successfully',
      supportCount: complaint.supportCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all supporters of a complaint
 * @route   GET /api/supports/supporters
 */
const getSupporters = async (req, res) => {
  const complaintId = req.query.complaintId || req.params.complaintId;
  try {
    const supporters = await Support.find({ complaint: complaintId })
      .populate('user', 'fullName email profilePhoto points level');
    res.json({
      success: true,
      count: supporters.length,
      data: supporters,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  supportComplaint,
  checkSupport,
  removeSupport,
  getSupporters,
};
