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
  const resolutionImages = req.files
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

    complaint.status = status;
    
    if (status === 'Resolved') {
      complaint.resolutionNotes = notes || 'The issue has been resolved by municipal workers.';
      if (resolutionImages.length > 0) {
        complaint.resolutionImages = resolutionImages;
        complaint.afterImages = resolutionImages; // Mirror to afterImages
      }
    }

    // Add timeline event
    complaint.timeline.push({
      status: status,
      title: `Status updated to ${status}`,
      description: notes || `Complaint progress updated by Officer ${req.user.fullName}.`,
      updatedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();

    // Notify citizen
    await Notification.create({
      recipient: complaint.citizen,
      title: `Complaint Marked ${status}`,
      message: `Your complaint "${complaint.title}" has been marked as ${status} by ${req.user.fullName}.`,
      type: 'Complaint Status',
    });

    // Notify Admins on Resolution
    if (status === 'Resolved') {
      const admins = await User.find({ role: 'Admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'Resolution Submitted for Review',
          message: `Officer ${req.user.fullName} has resolved complaint ID: ${complaint.complaintId}. Review required.`,
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

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  getNearbyComplaints,
  updateComplaintStatus,
  checkDuplicates,
};
