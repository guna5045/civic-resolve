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
  try {
    // Fetch complaints
    const complaints = await Complaint.find({})
      .populate('citizen', 'fullName')
      .populate('assignedOfficer', 'fullName')
      .populate('department', 'name');

    const fileName = `complaints_export_${Date.now()}.xlsx`;
    const relativePath = await generateExcelReport(complaints, fileName);
    const absolutePath = path.join(__dirname, '../../public', relativePath);

    // Save metadata in reports collection
    await Report.create({
      name: `City Complaints Spreadsheet - ${new Date().toLocaleDateString()}`,
      type: 'Excel',
      generatedBy: req.user._id,
      fileUrl: relativePath,
    });

    // Send file for download
    res.download(absolutePath, 'Complaints_Report.xlsx', (err) => {
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
  getReportsMetadata,
};
