const User = require('../models/User');
const Complaint = require('../models/Complaint');

/**
 * @desc    Get all officers or filter by department
 * @route   GET /api/officers
 * @access  Private (Admin/Officer)
 */
const getOfficers = async (req, res) => {
  const { departmentId } = req.query;
  let query = { role: 'Department Officer' };

  if (departmentId) {
    query.department = departmentId;
  }

  try {
    const officers = await User.find(query)
      .select('-passwordHash')
      .populate('department', 'name');

    res.json({ success: true, count: officers.length, data: officers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get officer stats and assigned workload summary
 * @route   GET /api/officers/:id/stats
 * @access  Private (Admin/Officer)
 */
const getOfficerStats = async (req, res) => {
  const officerId = req.params.id;

  try {
    // If the requesting user is a Department Officer, ensure they are fetching their own stats
    if (req.user.role === 'Department Officer' && String(req.user._id) !== String(officerId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = { assignedOfficer: officerId };
    if (req.user.role === 'Department Officer') {
      if (req.user.department) {
        query.department = req.user.department;
      } else {
        const mongoose = require('mongoose');
        query.department = new mongoose.Types.ObjectId(); // dummy
      }
    }

    const totalAssigned = await Complaint.countDocuments(query);
    const inProgress = await Complaint.countDocuments({ ...query, status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ ...query, status: 'Resolved' });
    const closed = await Complaint.countDocuments({ ...query, status: 'Closed' });
    const escalated = await Complaint.countDocuments({ ...query, status: 'Escalated' });

    res.json({
      success: true,
      data: {
        totalAssigned,
        inProgress,
        resolved,
        closed,
        escalated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get dashboard workload summary for logged in officer
 * @route   GET /api/officers/dashboard
 */
const getOfficerDashboard = async (req, res) => {
  try {
    const officerId = req.user._id;
    const query = { assignedOfficer: officerId };
    
    // Scoping to officer's department if defined
    if (req.user.department) {
      query.department = req.user.department;
    } else {
      const mongoose = require('mongoose');
      query.department = new mongoose.Types.ObjectId();
    }

    // 1. Core counters
    const totalAssigned = await Complaint.countDocuments(query);
    const pendingVerification = await Complaint.countDocuments({ ...query, status: { $in: ['Assigned', 'Reassigned'] } });
    const verified = await Complaint.countDocuments({ ...query, status: { $in: ['Verified', 'Verified By Officer'] } });
    const workStarted = await Complaint.countDocuments({ ...query, status: 'Work Started' });
    const resolvedAwaitingVerification = await Complaint.countDocuments({ ...query, status: 'Resolved' });
    const rejectedByOfficer = await Complaint.countDocuments({ ...query, status: 'Rejected By Officer' });
    const closed = await Complaint.countDocuments({ ...query, status: 'Closed' });

    // 2. Resolved Today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const resolvedToday = await Complaint.countDocuments({
      ...query,
      status: { $in: ['Resolved', 'Closed'] },
      timeline: {
        $elemMatch: {
          status: 'Resolved',
          timestamp: { $gte: startOfToday }
        }
      }
    });

    // 3. High Priority Issues (not Closed/Rejected)
    const highPriorityIssues = await Complaint.countDocuments({
      ...query,
      priority: { $in: ['High', 'Critical'] },
      status: { $nin: ['Closed', 'Rejected', 'Rejected By Officer'] }
    });

    // 4. Overdue Issues (Disabled: Civic Resolve does not use SLA monitoring)
    const overdueIssues = 0;

    // 5. Average Resolution Time (in hours)
    const resolvedComplaints = await Complaint.find({
      ...query,
      status: { $in: ['Resolved', 'Closed'] }
    });
    let totalResolutionTimeMs = 0;
    let resolvedCount = 0;
    resolvedComplaints.forEach((c) => {
      const resolvedEvent = c.timeline.find(t => t.status === 'Resolved');
      if (resolvedEvent) {
        const start = c.assignmentTimestamp || c.createdAt;
        const diff = new Date(resolvedEvent.timestamp) - new Date(start);
        if (diff > 0) {
          totalResolutionTimeMs += diff;
          resolvedCount++;
        }
      }
    });
    const averageResolutionTime = resolvedCount > 0
      ? Math.round(totalResolutionTimeMs / (1000 * 60 * 60 * resolvedCount))
      : 0;

    // 6. Recent Assignments (last 5 complaints assigned)
    const recentAssignments = await Complaint.find(query)
      .populate('citizen', 'fullName email mobile')
      .populate('department', 'name')
      .sort({ assignmentTimestamp: -1, createdAt: -1 })
      .limit(5);

    // 7. Recent Activity (last 5 timeline events on assigned issues)
    const officerComplaints = await Complaint.find(query);
    let allActivity = [];
    officerComplaints.forEach((c) => {
      c.timeline.forEach((event) => {
        allActivity.push({
          complaintId: c.complaintId,
          trackingId: c.trackingId,
          title: c.title,
          eventTitle: event.title,
          eventStatus: event.status,
          description: event.description,
          timestamp: event.timestamp,
        });
      });
    });
    allActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = allActivity.slice(0, 5);

    res.json({
      success: true,
      data: {
        totalAssigned,
        pendingVerification,
        verified,
        workStarted,
        resolvedAwaitingVerification,
        rejectedByOfficer,
        resolvedToday,
        averageResolutionTime,
        highPriorityIssues,
        overdueIssues,
        recentAssignments,
        recentActivity,
        closed,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all issues assigned to logged in officer
 * @route   GET /api/officers/issues
 */
const getOfficerIssues = async (req, res) => {
  try {
    const officerId = req.user._id;
    const query = { assignedOfficer: officerId };
    if (req.user.department) {
      query.department = req.user.department;
    } else {
      const mongoose = require('mongoose');
      query.department = new mongoose.Types.ObjectId();
    }

    const issues = await Complaint.find(query)
      .populate('citizen', 'fullName email mobile')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Officer updates status of an issue
 * @route   PUT /api/officers/update-status
 */
const updateIssueStatus = async (req, res) => {
  const { complaintId, status, notes } = req.body;
  try {
    const { changeStatus } = require('../services/complaintService');
    const complaint = await changeStatus(complaintId, status, notes, req.user._id);
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Officer uploads resolution proof notes and images
 * @route   POST /api/officers/upload-resolution
 */
const uploadResolution = async (req, res) => {
  const { complaintId, notes } = req.body;
  const resolutionImages = req.files
    ? req.files.map((file) => {
        if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
          return file.path;
        }
        return `/uploads/${file.filename}`;
      })
    : [];

  try {
    const { resolutionProcessing } = require('../services/officerService');
    const complaint = await resolutionProcessing(complaintId, notes, resolutionImages);
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get performance reports generated by officer
 * @route   GET /api/officers/reports
 */
const getOfficerReports = async (req, res) => {
  try {
    const Report = require('../models/Report');
    const reports = await Report.find({ generatedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get analytics for logged in officer
 * @route   GET /api/officers/analytics
 */
const getOfficerAnalytics = async (req, res) => {
  try {
    const officerId = req.user._id;
    const query = { assignedOfficer: officerId };

    if (req.user.department) {
      query.department = req.user.department;
    } else {
      const mongoose = require('mongoose');
      query.department = new mongoose.Types.ObjectId();
    }

    const complaints = await Complaint.find(query);

    // 1. Status breakdown
    const statusCounts = {};
    ['Assigned', 'Reassigned', 'Verified By Officer', 'Work Started', 'Rejected By Officer', 'Resolved', 'Closed'].forEach(s => {
      statusCounts[s] = 0;
    });
    complaints.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    const statusData = Object.keys(statusCounts).map(k => ({ name: k, count: statusCounts[k] }));

    // 2. Category breakdown
    const categoryCounts = {};
    complaints.forEach(c => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });
    const categoryData = Object.keys(categoryCounts).map(k => ({ name: k, value: categoryCounts[k] }));

    // 3. Priority breakdown
    const priorityCounts = {};
    complaints.forEach(c => {
      priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1;
    });
    const priorityData = Object.keys(priorityCounts).map(k => ({ name: k, count: priorityCounts[k] }));

    // 4. Monthly trend data (last 6 months)
    const trendData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);

      const reportedInMonth = await Complaint.countDocuments({
        ...query,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const resolvedInMonth = await Complaint.countDocuments({
        ...query,
        status: { $in: ['Resolved', 'Closed'] },
        timeline: {
          $elemMatch: {
            status: 'Resolved',
            timestamp: { $gte: startOfMonth, $lte: endOfMonth }
          }
        }
      });

      trendData.push({
        name: `${monthNames[m]} ${y}`,
        reported: reportedInMonth,
        resolved: resolvedInMonth
      });
    }

    // 5. Overall Performance Metrics
    const total = complaints.length;
    const resolved = complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;
    const successRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    let totalResolutionTimeMs = 0;
    let resolvedCount = 0;
    complaints.forEach((c) => {
      if (['Resolved', 'Closed'].includes(c.status)) {
        const resolvedEvent = c.timeline.find(t => t.status === 'Resolved');
        if (resolvedEvent) {
          const start = c.assignmentTimestamp || c.createdAt;
          const diff = new Date(resolvedEvent.timestamp) - new Date(start);
          if (diff > 0) {
            totalResolutionTimeMs += diff;
            resolvedCount++;
          }
        }
      }
    });
    const avgResolutionTime = resolvedCount > 0
      ? Math.round(totalResolutionTimeMs / (1000 * 60 * 60 * resolvedCount))
      : 0;

    res.json({
      success: true,
      data: {
        statusData,
        categoryData,
        priorityData,
        trendData,
        performanceMetrics: {
          totalAssigned: total,
          pendingVerification: complaints.filter(c => ['Assigned', 'Reassigned'].includes(c.status)).length,
          verified: complaints.filter(c => ['Verified', 'Verified By Officer'].includes(c.status)).length,
          workStarted: complaints.filter(c => c.status === 'Work Started').length,
          rejectedByOfficer: complaints.filter(c => c.status === 'Rejected By Officer').length,
          returnedByAdmin: complaints.filter(c => c.status === 'Reassigned').length,
          resolved,
          closed: complaints.filter(c => c.status === 'Closed').length,
          avgResolutionTimeHours: avgResolutionTime,
          successRate
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOfficers,
  getOfficerStats,
  getOfficerDashboard,
  getOfficerIssues,
  updateIssueStatus,
  uploadResolution,
  getOfficerReports,
  getOfficerAnalytics,
};
