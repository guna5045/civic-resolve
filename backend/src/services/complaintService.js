const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const generateTimelineEntry = (complaint, status, title, description, actorId = null) => {
  complaint.timeline.push({
    status,
    title,
    description,
    updatedBy: actorId,
    timestamp: new Date(),
  });
};

const createComplaint = async (data) => {
  const { complaintId, trackingId, citizenId, title, description, category, priority, latitude, longitude, departmentId, images, aiSummary } = data;

  const complaint = await Complaint.create({
    complaintId,
    trackingId,
    citizen: citizenId,
    title,
    description,
    aiSummary: aiSummary || '',
    category: category || 'Other',
    priority: priority || 'Medium',
    images: images || [],
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    department: departmentId,
    status: 'Submitted',
    timeline: [
      {
        status: 'Submitted',
        title: 'Complaint Registered',
        description: 'Your complaint has been successfully reported to the municipal system.',
        timestamp: new Date(),
      },
    ],
  });

  return complaint;
};

const updateComplaint = async (id, updateData) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new Error('Complaint not found');

  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      complaint[key] = updateData[key];
    }
  });

  return await complaint.save();
};

const assignDepartment = async (id, departmentId, actorId = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new Error('Complaint not found');

  complaint.department = departmentId;
  generateTimelineEntry(complaint, complaint.status, 'Reassigned Department', 'Municipal Department routing updated.', actorId);

  return await complaint.save();
};

const assignOfficer = async (id, officerId, actorId = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new Error('Complaint not found');

  complaint.assignedOfficer = officerId;
  complaint.status = 'Assigned';
  generateTimelineEntry(complaint, 'Assigned', 'Officer Assigned', 'Municipal officer assigned to inspect the issue.', actorId);

  return await complaint.save();
};

const changeStatus = async (id, status, notes, actorId = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new Error('Complaint not found');

  complaint.status = status;
  generateTimelineEntry(complaint, status, `Status changed to ${status}`, notes || `Ticket transitioned to ${status}.`, actorId);

  return await complaint.save();
};

const calculateSupportImpact = async (complaintId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) return;

  // Supports can elevate priorities automatically
  if (complaint.supportCount >= 50 && complaint.priority === 'Medium') {
    complaint.priority = 'High';
    generateTimelineEntry(complaint, complaint.status, 'Priority Auto-Elevated', 'Priority updated to High due to community upvote interest.');
    await complaint.save();
  }
};

module.exports = {
  createComplaint,
  updateComplaint,
  assignDepartment,
  assignOfficer,
  changeStatus,
  generateTimelineEntry,
  calculateSupportImpact,
};
