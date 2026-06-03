const Complaint = require('../models/Complaint');
const Report = require('../models/Report');
const { generateExcelReport, generatePDFReport } = require('../services/reportService');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Export complaints in Excel format
 * @route   GET /api/reports/excel
 * @access  Private (Admin/Officer)
 */
const exportExcel = async (req, res) => {
  const { reportType } = req.query;

  try {
    let query = {};
    if (req.user.role === 'Department Officer') {
      if (req.user.department) {
        query.department = req.user.department;
        query.assignedOfficer = req.user._id;
      } else {
        return res.status(403).json({ success: false, message: 'Access Denied: No department assigned' });
      }
    }

    if (reportType === 'assignment') {
      query.status = { $in: ['Assigned', 'Reassigned', 'Verified', 'Verified By Officer', 'Work Started'] };
    } else if (reportType === 'resolution') {
      query.status = { $in: ['Resolved', 'Closed'] };
    }

    // Fetch complaints
    const complaints = await Complaint.find(query)
      .populate('citizen', 'fullName')
      .populate('assignedOfficer', 'fullName')
      .populate('department', 'name');

    if (complaints.length === 0) {
      return res.status(400).json({ success: false, message: 'No data available for this report' });
    }

    const fileName = `complaints_export_${reportType || 'all'}_${Date.now()}.xlsx`;
    const relativePath = await generateExcelReport(complaints, fileName, 'Monthly');
    const absolutePath = path.join(__dirname, '../../public', relativePath);

    // Save metadata in reports collection
    await Report.create({
      name: `Spreadsheet Export (${reportType || 'All Workload'}) - ${new Date().toLocaleDateString()}`,
      type: 'Excel',
      generatedBy: req.user._id,
      fileUrl: relativePath,
    });

    // Send file for download
    res.download(absolutePath, `Complaints_${reportType || 'Workload'}_Report.xlsx`, (err) => {
      if (err) {
        console.error('File download error:', err);
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export a single complaint detail in PDF format
 * @route   GET /api/reports/pdf/:complaintId
 * @access  Private
 */
const exportPDF = async (req, res) => {
  const complaintId = req.params.complaintId;

  try {
    const complaint = await Complaint.findById(complaintId)
      .populate('citizen', 'fullName email mobile')
      .populate('assignedOfficer', 'fullName email mobile')
      .populate('department', 'name departmentHead');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const fileName = `complaint_${complaint.complaintId}_${Date.now()}.pdf`;
    const relativePath = await generatePDFReport(complaint, fileName);
    const absolutePath = path.join(__dirname, '../../public', relativePath);

    // Save metadata
    await Report.create({
      name: `Complaint Sheet (${complaint.complaintId})`,
      type: 'PDF',
      generatedBy: req.user._id,
      fileUrl: relativePath,
    });

    res.download(absolutePath, `${complaint.complaintId}_Report.pdf`, (err) => {
      if (err) {
        console.error('PDF download error:', err);
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export a summary of complaints in PDF format
 * @route   GET /api/reports/pdf-summary
 * @access  Private (Admin/Officer)
 */
const exportPDFSummary = async (req, res) => {
  const { reportType } = req.query;

  try {
    let query = {};
    if (req.user.role === 'Department Officer') {
      if (req.user.department) {
        query.department = req.user.department;
        query.assignedOfficer = req.user._id;
      } else {
        return res.status(403).json({ success: false, message: 'Access Denied: No department assigned' });
      }
    }

    if (reportType === 'assignment') {
      query.status = { $in: ['Assigned', 'Reassigned', 'Verified', 'Verified By Officer', 'Work Started'] };
    } else if (reportType === 'resolution') {
      query.status = { $in: ['Resolved', 'Closed'] };
    }

    const complaints = await Complaint.find(query)
      .populate('citizen', 'fullName email mobile')
      .populate('assignedOfficer', 'fullName email')
      .populate('department', 'name');

    if (complaints.length === 0) {
      return res.status(400).json({ success: false, message: 'No data available for this report' });
    }

    const fileName = `complaints_summary_${reportType || 'all'}_${Date.now()}.pdf`;
    const { generateSummaryPDFReport } = require('../services/reportService');
    const relativePath = await generateSummaryPDFReport(complaints, reportType || 'all', req.user, fileName);
    const absolutePath = path.join(__dirname, '../../public', relativePath);

    // Save metadata
    await Report.create({
      name: `Summary PDF Export (${reportType || 'All Workload'}) - ${new Date().toLocaleDateString()}`,
      type: 'PDF',
      generatedBy: req.user._id,
      fileUrl: relativePath,
    });

    res.download(absolutePath, `Workload_Summary_${reportType || 'All'}_Report.pdf`, (err) => {
      if (err) {
        console.error('Summary PDF download error:', err);
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all generated reports metadata
 * @route   GET /api/reports
 * @access  Private (Admin only)
 */
const getReportsMetadata = async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('generatedBy', 'fullName email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  exportExcel,
  exportPDF,
  exportPDFSummary,
  getReportsMetadata,
};
