const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { generateTimelineEntry } = require('./complaintService');

const issueAssignment = async (complaintId, officerId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error('Complaint not found');

  const officer = await User.findById(officerId);
  if (!officer || officer.role !== 'Department Officer') {
    throw new Error('Invalid officer profile');
  }

  complaint.assignedOfficer = officerId;
  complaint.status = 'Assigned';
  
  generateTimelineEntry(complaint, 'Assigned', 'Officer Assigned', `Complaint routed to Officer: ${officer.fullName}`);
  await complaint.save();

  // Notify officer
  await Notification.create({
    recipient: officerId,
    title: 'New Task Assigned 📋',
    message: `You have been assigned to complaint ID: ${complaint.complaintId}.`,
    type: 'Officer Assignment',
  });

  return complaint;
};

const resolutionProcessing = async (complaintId, notes, images) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error('Complaint not found');

  complaint.status = 'Resolved';
  complaint.resolutionNotes = notes || 'Municipal department has resolved the issue.';
  if (images && images.length > 0) {
    complaint.resolutionImages = images;
    complaint.afterImages = images;
  }

  generateTimelineEntry(complaint, 'Resolved', 'Resolution Proof Submitted', 'Officer resolved the issue and uploaded proof. Awaiting Admin review.', complaint.assignedOfficer);
  await complaint.save();

  // Alert Admins
  const admins = await User.find({ role: 'Admin' });
  for (const admin of admins) {
    await Notification.create({
      recipient: admin._id,
      title: 'Resolution Pending Review',
      message: `Resolution proof submitted for Complaint ID: ${complaint.complaintId}. Review required.`,
      type: 'System Alert',
    });
  }

  return complaint;
};

const performanceTracking = async (officerId) => {
  const total = await Complaint.countDocuments({ assignedOfficer: officerId });
  const resolved = await Complaint.countDocuments({ assignedOfficer: officerId, status: { $in: ['Resolved', 'Closed'] } });
  const pending = await Complaint.countDocuments({ assignedOfficer: officerId, status: { $in: ['Assigned', 'In Progress'] } });
  const escalated = await Complaint.countDocuments({ assignedOfficer: officerId, status: 'Escalated' });

  return {
    total,
    resolved,
    pending,
    escalated,
    efficiencyRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
};

module.exports = {
  issueAssignment,
  resolutionProcessing,
  performanceTracking,
};
