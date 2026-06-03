const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { analyzeComplaintText } = require('../services/aiService');

const getLevelFromPoints = (points) => {
  if (points >= 1000) return 5; // Civic Champion
  if (points >= 600) return 4;  // City Contributor
  if (points >= 300) return 3;  // Community Guardian
  if (points >= 100) return 2;  // Community Helper
  return 1; // Civic Starter
};

/**
 * @desc    Report a new Complaint
 * @route   POST /api/complaints
 * @access  Private (Citizen only)
 */
const createComplaint = async (req, res) => {
  const { title, description, category, priority, latitude, longitude, departmentId } = req.body;

  try {
    // Generate tracking and user-friendly ID
    const trackingId = 'TRK-' + Math.floor(100000 + Math.random() * 900000);
    const complaintId = 'CR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    // Call AI analyzer with gracefall fallback
    const aiAnalysis = await analyzeComplaintText(title, description, category || 'Other');

    // Fetch department
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Capture uploaded files from multer dynamically resolving local vs Cloudinary urls
    const images = req.files
      ? req.files.map((file) => {
          if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
            return file.path;
          }
          return `/uploads/${file.filename}`;
        })
      : [];

    const complaint = await Complaint.create({
      complaintId,
      trackingId,
      citizen: req.user._id,
      title,
      description,
      aiSummary: aiAnalysis.summary,
      aiReason: aiAnalysis.reason || '',
      category: aiAnalysis.category,
      priority: aiAnalysis.priority,
      originalPriority: aiAnalysis.priority,
      images,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      department: departmentId,
      status: 'Submitted', // Default starts as Submitted for review
      timeline: [
        {
          status: 'Submitted',
          title: 'Complaint Registered',
          description: 'Your complaint has been successfully reported to the municipal system.',
          timestamp: new Date(),
        },
      ],
    });

    // Reward points: 20 points for reporting, plus 50 points if it is their first complaint
    const existingCount = await Complaint.countDocuments({ citizen: req.user._id });
    const isFirst = existingCount === 1; // It was just created above, so count is 1
    const pointsAwarded = 20 + (isFirst ? 50 : 0);

    const user = await User.findById(req.user._id);
    const originalLevel = user.level;
    user.points += pointsAwarded;
    user.level = getLevelFromPoints(user.points);

    // Update streak tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isAlreadyActiveToday = user.activityDates.some(
      (d) => new Date(d).setHours(0, 0, 0, 0) === today.getTime()
    );
    if (!isAlreadyActiveToday) {
      user.activityDates.push(today);
      if (user.lastActiveDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastActive = new Date(user.lastActiveDate);
        lastActive.setHours(0, 0, 0, 0);

        if (lastActive.getTime() === yesterday.getTime()) {
          user.activityStreak = (user.activityStreak || 0) + 1;
        } else if (lastActive.getTime() !== today.getTime()) {
          user.activityStreak = 1;
        }
      } else {
        user.activityStreak = 1;
      }
      user.lastActiveDate = today;
    }

    await user.save();

    // Create system notification for report submission
    await Notification.create({
      recipient: req.user._id,
      title: 'Issue Reported Successfully',
      message: `Your complaint "${title}" was successfully created. Tracking ID: ${trackingId}. Earned +${pointsAwarded} XP!`,
      type: 'Complaint Status',
    });

    if (user.level !== originalLevel) {
      await Notification.create({
        recipient: req.user._id,
        title: 'Level Up Alert! 📈',
        message: `Congratulations! Your civic reputation level has increased to Level ${user.level}.`,
        type: 'Points Added',
      });
    }

    // Write to Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Report Complaint',
      module: 'Complaints',
      description: `Reported issue ID: ${complaintId}. Category auto-selected: ${aiAnalysis.category}, priority: ${aiAnalysis.priority}.`,
    }).catch((e) => console.error('Failed to log audit:', e));

    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all complaints with filters (pagination, query, category, status)
 * @route   GET /api/complaints
 * @access  Private/Public
 */
const getComplaints = async (req, res) => {
  const { status, category, priority, search, officer } = req.query;

  let query = {};

  if (status) query.status = status;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (officer) query.assignedOfficer = officer;
  if (req.query.citizen) query.citizen = req.query.citizen;
  if (req.query._id) query._id = req.query._id;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { complaintId: { $regex: search, $options: 'i' } },
      { trackingId: { $regex: search, $options: 'i' } },
    ];
  }

  // Officer department filtering
  if (req.user.role === 'Department Officer') {
    if (req.user.department) {
      query.department = req.user.department;
    } else {
      const mongoose = require('mongoose');
      query.department = new mongoose.Types.ObjectId(); // dummy to return empty array
    }
  }

  try {
    const complaints = await Complaint.find(query)
      .populate('citizen', 'fullName email mobile profilePhoto')
      .populate('assignedOfficer', 'fullName email mobile profilePhoto')
      .populate('department', 'name departmentHead')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private
 */
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'fullName email mobile profilePhoto points level')
      .populate('assignedOfficer', 'fullName email mobile profilePhoto')
      .populate('department', 'name departmentHead');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Access control for Department Officers
    if (req.user.role === 'Department Officer' && String(complaint.department?._id || complaint.department) !== String(req.user.department)) {
      return res.status(403).json({ success: false, message: 'Access denied: Complaint belongs to a different department' });
    }

    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get nearby complaints (within coordinate threshold)
 * @route   GET /api/complaints/nearby
 * @access  Private
 */
const getNearbyComplaints = async (req, res) => {
  const { lat, lng, radiusKm = 0.1 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
  }

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = parseFloat(radiusKm);

    // Bounding box approximation: 1 degree latitude ~= 111km, 1 degree longitude ~= 111km * cos(lat)
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((latitude * Math.PI) / 180));

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

    const complaints = await Complaint.find({
      latitude: { $gte: minLat, $lte: maxLat },
      longitude: { $gte: minLng, $lte: maxLng },
      status: { $nin: ['Closed', 'Rejected', 'Rejected By Officer', 'Cancelled'] }
    })
      .populate('citizen', 'fullName email')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update complaint status (Officer/Admin only)
 * @route   PATCH /api/complaints/:id/status
 * @access  Private (Officer/Admin)
 */
const updateComplaintStatus = async (req, res) => {
  const { status, notes } = req.body;
  const uploadedFiles = req.files
    ? req.files.map((file) => {
        if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
          return file.path;
        }
        return `/uploads/${file.filename}`;
      })
    : [];

  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const previousStatus = complaint.status;

    // Role-based status workflow enforcement
    if (req.user.role === 'Department Officer') {
      const allowedTargetStatuses = ['Verified', 'Verified By Officer', 'Work Started', 'Rejected By Officer', 'Resolved'];
      if (!allowedTargetStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Department Officers are only authorized to transition complaints to 'Verified', 'Work Started', 'Rejected By Officer', or 'Resolved'."
        });
      }

      if (status !== previousStatus) {
        if (status === 'Verified' || status === 'Verified By Officer') {
          if (!['Assigned', 'Reassigned'].includes(previousStatus)) {
            return res.status(400).json({
              success: false,
              message: `Cannot transition complaint from status '${previousStatus}' to 'Verified'. Sequence must be Assigned/Reassigned -> Verified.`
            });
          }
        } else if (status === 'Work Started') {
          if (!['Verified', 'Verified By Officer'].includes(previousStatus)) {
            return res.status(400).json({
              success: false,
              message: `Cannot transition complaint from status '${previousStatus}' to 'Work Started'. Sequence must be Verified -> Work Started.`
            });
          }
        } else if (status === 'Rejected By Officer') {
          if (!['Assigned', 'Reassigned', 'Verified', 'Verified By Officer'].includes(previousStatus)) {
            return res.status(400).json({
              success: false,
              message: `Cannot transition complaint from status '${previousStatus}' to 'Rejected By Officer'. Sequence must be Assigned or Verified -> Rejected By Officer.`
            });
          }
        } else if (status === 'Resolved') {
          if (previousStatus !== 'Work Started') {
            return res.status(400).json({
              success: false,
              message: `Cannot transition complaint from status '${previousStatus}' to 'Resolved'. Sequence must be Work Started -> Resolved.`
            });
          }
        }
      }
    } else if (req.user.role === 'Admin') {
      const allowedAdminStatuses = ['Under Review', 'Assigned', 'Closed', 'Rejected', 'Clarification Required', 'In Progress', 'Reassigned', 'Work Started'];
      if (!allowedAdminStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Admins cannot transition complaints to '${status}' directly via this endpoint.`
        });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify complaint status.' });
    }

    // Apply status transition
    complaint.status = status;

    let timelineTitle = `Status updated to ${status}`;
    let timelineDescription = notes || `Complaint progress updated by ${req.user.fullName}.`;
    let citizenNotificationTitle = `Complaint Marked ${status}`;
    let citizenNotificationMessage = `Your complaint "${complaint.title}" has been marked as ${status} by ${req.user.fullName}.`;

    if (status === 'Verified' || status === 'Verified By Officer') {
      complaint.verifiedByOfficer = true;
      complaint.verificationTimestamp = new Date();
      complaint.verificationStatus = 'Verified';
      
      timelineTitle = 'Issue Verified By Officer';
      timelineDescription = notes || `Officer ${req.user.fullName} verified the issue on-site.`;
      citizenNotificationTitle = 'Issue Verified';
      citizenNotificationMessage = `Officer ${req.user.fullName} has verified your complaint "${complaint.title}".`;
    } 
    else if (status === 'Work Started') {
      complaint.workStartTimestamp = new Date();
      
      timelineTitle = 'Work Started By Officer';
      timelineDescription = 'Officer has started repair work.';
      citizenNotificationTitle = 'Work Started';
      citizenNotificationMessage = `Officer ${req.user.fullName} has started work on your complaint "${complaint.title}".`;
    } 
    else if (status === 'Rejected By Officer') {
      complaint.rejectionReason = req.body.rejectionReason || notes || '';
      if (uploadedFiles.length > 0) {
        complaint.rejectionImages = uploadedFiles;
      }
      
      timelineTitle = 'Rejected By Officer';
      timelineDescription = complaint.rejectionReason || 'Officer rejected this issue.';
      citizenNotificationTitle = 'Complaint Rejected by Officer';
      citizenNotificationMessage = `Officer ${req.user.fullName} has rejected your complaint "${complaint.title}". Reason: ${complaint.rejectionReason}`;
    } 
    else if (status === 'Resolved') {
      complaint.resolutionNotes = req.body.resolutionNotes || req.body.notes || notes || 'The issue has been resolved by municipal workers.';
      complaint.resolutionSummary = req.body.resolutionSummary || '';
      complaint.completionTimestamp = new Date();
      if (uploadedFiles.length > 0) {
        complaint.resolutionImages = uploadedFiles;
        complaint.afterImages = uploadedFiles; // Mirror to afterImages
      }

      timelineTitle = 'Issue Resolved By Officer';
      timelineDescription = complaint.resolutionNotes;
      citizenNotificationTitle = 'Resolution Submitted';
      citizenNotificationMessage = `Officer ${req.user.fullName} has completed repairs and submitted resolution proof for your complaint "${complaint.title}".`;
    }

    // Add timeline event
    complaint.timeline.push({
      status: status,
      title: timelineTitle,
      description: timelineDescription,
      updatedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();

    // Notify citizen
    await Notification.create({
      recipient: complaint.citizen,
      title: citizenNotificationTitle,
      message: citizenNotificationMessage,
      type: 'Complaint Status',
    });

    // Notify Admins on Resolution or Rejection
    if (status === 'Resolved' || status === 'Rejected By Officer') {
      const admins = await User.find({ role: 'Admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: status === 'Resolved' ? 'Resolution Pending Review' : 'Complaint Rejected by Officer',
          message: status === 'Resolved' 
            ? `Officer ${req.user.fullName} has resolved complaint ID: ${complaint.complaintId}. Review required.`
            : `Officer ${req.user.fullName} has rejected complaint ID: ${complaint.complaintId}. Reason: ${complaint.rejectionReason}`,
          type: 'System Alert',
        });
      }
    }

    // Write to Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Update Status',
      module: 'Officer Console',
      description: `Transitioned complaint ID: ${complaint.complaintId} status to: ${status}.`,
    }).catch(e => console.error('Failed to log audit:', e));

    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Clarify / Update complaint details by Citizen
 * @route   PUT /api/complaints/:id/clarify
 * @access  Private (Citizen only)
 */
const clarifyComplaint = async (req, res) => {
  const { title, description } = req.body;
  const newImages = req.files
    ? req.files.map((file) => {
        if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
          return file.path;
        }
        return `/uploads/${file.filename}`;
      })
    : [];

  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Verify ownership
    if (String(complaint.citizen) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this complaint' });
    }

    // Verify status
    if (complaint.status !== 'Clarification Required') {
      return res.status(400).json({ success: false, message: 'Clarification is not requested for this complaint' });
    }

    // Update details
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (req.body.clarificationResponse) {
      complaint.clarificationResponse = req.body.clarificationResponse;
    }
    
    // Append images
    if (newImages.length > 0) {
      complaint.images = [...complaint.images, ...newImages];
    }

    // Move status back to Information Clarified
    complaint.status = 'Information Clarified';

    // Add timeline event
    complaint.timeline.push({
      status: 'Information Clarified',
      title: 'Information Clarified',
      description: 'The reporter has updated the requested details. Returned to review queue.',
      updatedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();

    // Notify Admin
    const admins = await User.find({ role: 'Admin' });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        title: 'Complaint Clarification Received',
        message: `Citizen ${req.user.fullName} has updated details for complaint: ${complaint.complaintId}.`,
        type: 'System Alert',
      });
    }

    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

/**
 * @desc    Check for duplicate complaints within radius
 * @route   POST /api/complaints/check-duplicates
 * @access  Private (Citizen only)
 */
const checkDuplicates = async (req, res) => {
  const { latitude, longitude, category, title } = req.body;
  if (!latitude || !longitude || !category) {
    return res.status(400).json({ success: false, message: 'Latitude, Longitude and Category are required' });
  }

  try {
    const radius = 0.1; // 100 meters
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Bounding box for 100m
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    // Find active complaints nearby in the same category
    const activeStatuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress'];
    const candidates = await Complaint.find({
      latitude: { $gte: minLat, $lte: maxLat },
      longitude: { $gte: minLng, $lte: maxLng },
      category: category,
      status: { $in: activeStatuses }
    });

    // Perform keyword comparison (compare title words of length > 2)
    const searchWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const duplicates = candidates.filter(candidate => {
      const candidateTitleLower = candidate.title.toLowerCase();
      const titleLower = title.toLowerCase();
      
      // Substring match
      if (candidateTitleLower.includes(titleLower) || titleLower.includes(candidateTitleLower)) {
        return true;
      }
      
      // Keyword overlap
      const overlapCount = searchWords.filter(word => candidateTitleLower.includes(word)).length;
      return overlapCount > 0;
    });

    res.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.map(d => ({
        _id: d._id,
        title: d.title,
        status: d.status,
        supportCount: d.supportCount,
        priority: d.priority,
        latitude: d.latitude,
        longitude: d.longitude,
        distance: Math.round(getDistanceMeters(lat, lng, d.latitude, d.longitude))
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete own complaint by Citizen (only before administrative processing)
 * @route   DELETE /api/complaints/:id
 * @access  Private (Citizen only)
 */
const deleteOwnComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    
    // Verify ownership
    if (String(complaint.citizen) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this complaint' });
    }
    
    // Verify status: Citizen CAN delete complaint when status is: Submitted, Clarification Required, Information Clarified
    const allowedStatuses = ['Submitted', 'Clarification Required', 'Information Clarified'];
    if (!allowedStatuses.includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message: 'Once a complaint has been reviewed or verified by the administration, deletion will no longer be permitted.'
      });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    // Delete associated supports
    const Support = require('../models/Support');
    await Support.deleteMany({ complaint: req.params.id });

    // Write to Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Delete Complaint',
      module: 'Complaints',
      description: `Deleted complaint ID: ${complaint.complaintId}, Tracking ID: ${complaint.trackingId}`,
    }).catch(e => console.error('Failed to log audit:', e));

    res.json({ success: true, message: 'Complaint deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  getNearbyComplaints,
  updateComplaintStatus,
  checkDuplicates,
  clarifyComplaint,
  deleteOwnComplaint,
};
