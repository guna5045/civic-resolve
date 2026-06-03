const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '../../public/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Generates an Excel report of complaints and saves it locally.
 * @param {Array} complaints 
 * @param {string} fileName 
 * @returns {Promise<string>} File path/URL
 */
const generateExcelReport = async (complaints, fileName = 'complaints_report.xlsx', reportRange = 'Monthly') => {
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Detailed Complaints Ledger
  const ledgerSheet = workbook.addWorksheet('Complaints Ledger');
  ledgerSheet.columns = [
    { header: 'Complaint ID', key: 'complaintId', width: 15 },
    { header: 'Title', key: 'title', width: 25 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Citizen Name', key: 'citizenName', width: 20 },
    { header: 'Assigned Officer', key: 'officerName', width: 20 },
    { header: 'Support Count', key: 'supportCount', width: 12 },
    { header: 'Created Date', key: 'createdAt', width: 20 },
  ];
  ledgerSheet.getRow(1).font = { bold: true };
  
  complaints.forEach((c) => {
    ledgerSheet.addRow({
      complaintId: c.complaintId,
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      citizenName: c.citizen ? c.citizen.fullName : 'N/A',
      officerName: c.assignedOfficer ? c.assignedOfficer.fullName : 'Unassigned',
      supportCount: c.supportCount || 0,
      createdAt: c.createdAt ? c.createdAt.toISOString().split('T')[0] : 'N/A',
    });
  });

  // Sheet 2: Category Statistics
  const catSheet = workbook.addWorksheet('Category Stats');
  catSheet.columns = [
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Total Issues', key: 'count', width: 15 },
    { header: 'Percentage', key: 'percent', width: 15 },
  ];
  catSheet.getRow(1).font = { bold: true };
  
  const catCounts = {};
  complaints.forEach(c => {
    catCounts[c.category] = (catCounts[c.category] || 0) + 1;
  });
  
  Object.keys(catCounts).forEach(cat => {
    catSheet.addRow({
      category: cat,
      count: catCounts[cat],
      percent: complaints.length > 0 ? `${Math.round((catCounts[cat] / complaints.length) * 100)}%` : '0%',
    });
  });

  // Sheet 3: Area Coordinates Statistics
  const areaSheet = workbook.addWorksheet('Area Stats');
  areaSheet.columns = [
    { header: 'Zone/Coordinate Cluster', key: 'zone', width: 25 },
    { header: 'Total Reports', key: 'count', width: 15 },
  ];
  areaSheet.getRow(1).font = { bold: true };
  
  const zoneCounts = {};
  complaints.forEach(c => {
    // Cluster by rounding latitude/longitude to 2 decimal places
    const zoneKey = `Lat: ${c.latitude?.toFixed(2) || 0.0}, Lng: ${c.longitude?.toFixed(2) || 0.0}`;
    zoneCounts[zoneKey] = (zoneCounts[zoneKey] || 0) + 1;
  });

  Object.keys(zoneCounts).forEach(zone => {
    areaSheet.addRow({
      zone: zone,
      count: zoneCounts[zone],
    });
  });

  // Sheet 4: Support Statistics
  const supportSheet = workbook.addWorksheet('Support Stats');
  supportSheet.columns = [
    { header: 'Complaint ID', key: 'complaintId', width: 15 },
    { header: 'Title', key: 'title', width: 25 },
    { header: 'Support Upvotes', key: 'supportCount', width: 18 },
  ];
  supportSheet.getRow(1).font = { bold: true };
  
  // Sort complaints by supportCount descending
  const sortedBySupport = [...complaints].sort((a, b) => (b.supportCount || 0) - (a.supportCount || 0));
  sortedBySupport.slice(0, 20).forEach(c => {
    supportSheet.addRow({
      complaintId: c.complaintId,
      title: c.title,
      supportCount: c.supportCount || 0,
    });
  });

  // Sheet 5: Resolution Metrics
  const resSheet = workbook.addWorksheet('Resolution Metrics');
  resSheet.columns = [
    { header: 'Metric Name', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 15 },
  ];
  resSheet.getRow(1).font = { bold: true };
  
  const total = complaints.length;
  const resolved = complaints.filter(c => c.status === 'Closed' || c.status === 'Resolved').length;
  const rate = total > 0 ? `${Math.round((resolved / total) * 100)}%` : '0%';
  
  // Calculate average resolution duration in hours
  let totalHours = 0;
  let resolvedCount = 0;
  complaints.forEach(c => {
    if ((c.status === 'Closed' || c.status === 'Resolved') && c.timeline) {
      const resolvedEvent = c.timeline.find(evt => evt.status === 'Resolved');
      if (resolvedEvent) {
        const diffMs = new Date(resolvedEvent.timestamp) - new Date(c.createdAt);
        totalHours += diffMs / (1000 * 60 * 60);
        resolvedCount++;
      }
    }
  });

  const avgHours = resolvedCount > 0 ? `${Math.round(totalHours / resolvedCount)} Hours` : 'N/A';

  resSheet.addRow({ metric: 'Report Frequency Range', value: reportRange });
  resSheet.addRow({ metric: 'Total Complaints Evaluated', value: total });
  resSheet.addRow({ metric: 'Resolved/Closed Tickets', value: resolved });
  resSheet.addRow({ metric: 'Resolution Completion Rate', value: rate });
  resSheet.addRow({ metric: 'Average Resolution Speed', value: avgHours });

  const filePath = path.join(reportsDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  
  return `/reports/${fileName}`;
};

/**
 * Generates a PDF sheet for a single complaint or summary.
 * @param {Object} complaint 
 * @param {string} fileName 
 * @returns {Promise<string>} File path/URL
 */
const generatePDFReport = async (complaint, fileName = 'complaint_details.pdf') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filePath = path.join(reportsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Title & Header
      doc.fontSize(20).text('CIVIC RESOLVE - COMPLAINT REPORT', { align: 'center' });
      doc.moveDown();
      doc.strokeColor('#cccccc').moveTo(50, 80).lineTo(550, 80).stroke();
      doc.moveDown();

      // Complaint Details
      doc.fontSize(12).fillColor('#333333');
      doc.font('Helvetica-Bold').text(`Complaint ID: `, { continued: true }).font('Helvetica').text(complaint.complaintId);
      doc.font('Helvetica-Bold').text(`Tracking ID:  `, { continued: true }).font('Helvetica').text(complaint.trackingId);
      doc.font('Helvetica-Bold').text(`Title:        `, { continued: true }).font('Helvetica').text(complaint.title);
      doc.font('Helvetica-Bold').text(`Category:     `, { continued: true }).font('Helvetica').text(complaint.category);
      doc.font('Helvetica-Bold').text(`Priority:     `, { continued: true }).font('Helvetica').text(complaint.priority);
      doc.font('Helvetica-Bold').text(`Status:       `, { continued: true }).font('Helvetica').text(complaint.status);
      doc.font('Helvetica-Bold').text(`Citizen:      `, { continued: true }).font('Helvetica').text(complaint.citizen ? complaint.citizen.fullName : 'Anonymous');
      doc.font('Helvetica-Bold').text(`Officer:      `, { continued: true }).font('Helvetica').text(complaint.assignedOfficer ? complaint.assignedOfficer.fullName : 'Unassigned');
      doc.font('Helvetica-Bold').text(`Supports:     `, { continued: true }).font('Helvetica').text(String(complaint.supportCount || 0));
      
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Description:');
      doc.font('Helvetica').text(complaint.description);

      if (complaint.aiSummary) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('AI-Assisted Summary:');
        doc.font('Helvetica').text(complaint.aiSummary);
      }

      if (complaint.resolutionNotes) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Resolution Notes:');
        doc.font('Helvetica').text(complaint.resolutionNotes);
      }

      // Timeline Events
      if (complaint.timeline && complaint.timeline.length > 0) {
        doc.moveDown(2);
        doc.fontSize(14).font('Helvetica-Bold').text('RESOLUTION TIMELINE');
        doc.moveDown();

        complaint.timeline.forEach((event, i) => {
          doc.fontSize(10).font('Helvetica-Bold').text(`Step ${i + 1}: ${event.title} (${event.status})`);
          doc.font('Helvetica').text(`Description: ${event.description}`);
          doc.text(`Date: ${event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}`);
          doc.moveDown();
        });
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(10).fillColor('#888888').text('Generated by Civic Resolve Governance Platform. Confidential municipal document.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(`/reports/${fileName}`);
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generates a summary PDF report compiling multiple complaints.
 */
const generateSummaryPDFReport = async (complaints, reportType, user, fileName = 'summary_report.pdf') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filePath = path.join(reportsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Report Title & Contextual Header
      let title = 'CIVIC RESOLVE - GENERAL WORKLOAD LEDGER';
      let scopeDesc = 'Comprehensive analysis of all registered assignments.';
      if (reportType === 'assignment') {
        title = 'CIVIC RESOLVE - ACTIVE ASSIGNMENTS REPORT';
        scopeDesc = 'Detailed register of all pending and currently active tasks.';
      } else if (reportType === 'resolution') {
        title = 'CIVIC RESOLVE - RESOLUTION EVIDENCE LOG';
        scopeDesc = 'Official record of resolved tickets containing resolution proof.';
      } else if (reportType === 'performance') {
        title = 'CIVIC RESOLVE - OFFICER PERFORMANCE AUDIT';
        scopeDesc = 'Key execution metrics, completion rates, and speed indexes.';
      }

      // Title & Header Styles
      doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text(title, { align: 'left' });
      doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(`${scopeDesc} | Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Generated By: ${user.fullName} (${user.role})`);
      doc.moveDown();
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 95).lineTo(550, 95).stroke();
      doc.moveDown(1.5);

      // Calculations for metrics block
      const total = complaints.length;
      const resolved = complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;
      const active = complaints.filter(c => ['Assigned', 'Reassigned', 'Verified', 'Verified By Officer', 'Work Started'].includes(c.status)).length;
      const successRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      let totalResolutionTimeMs = 0;
      let resolvedCount = 0;
      complaints.forEach((c) => {
        if (['Resolved', 'Closed'].includes(c.status)) {
          const resolvedEvent = c.timeline && c.timeline.find(t => t.status === 'Resolved');
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

      // Draw Key Metric Box
      doc.fillColor('#f8fafc').rect(50, 105, 500, 65).fill();
      doc.strokeColor('#e2e8f0').rect(50, 105, 500, 65).stroke();
      
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
      doc.text('KEY METRICS OVERVIEW', 65, 115);
      
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      if (reportType === 'performance') {
        doc.text(`Total Tickets Evaluated: ${total}   |   Resolved Tasks: ${resolved}   |   Active Tasks: ${active}`, 65, 132);
        doc.text(`Resolution Success Rate: ${successRate}%   |   Avg Resolution Speed: ${avgResolutionTime || 'N/A'} Hours`, 65, 147);
      } else if (reportType === 'assignment') {
        doc.text(`Total Active Workload: ${total} Tasks   |   Verified & In-Progress: ${complaints.filter(c => c.status === 'Work Started').length}`, 65, 132);
        doc.text(`Pending Verification: ${complaints.filter(c => ['Assigned', 'Reassigned'].includes(c.status)).length}`, 65, 147);
      } else if (reportType === 'resolution') {
        doc.text(`Total Resolved Tickets: ${resolved}   |   Confirmed Closed by Admin: ${complaints.filter(c => c.status === 'Closed').length}`, 65, 132);
        doc.text(`Avg Resolution Duration: ${avgResolutionTime || 'N/A'} Hours`, 65, 147);
      } else {
        doc.text(`Total Complaints: ${total}   |   Active Tasks: ${active}   |   Resolved Tasks: ${resolved}`, 65, 132);
        doc.text(`Completion Ratio: ${successRate}%   |   Avg Speed: ${avgResolutionTime || 'N/A'} Hours`, 65, 147);
      }

      doc.moveDown(4);

      // Section: Category and Priority Breakdowns (Performance specific)
      if (reportType === 'performance') {
        const catMap = {};
        const prioMap = {};
        complaints.forEach(c => {
          catMap[c.category] = (catMap[c.category] || 0) + 1;
          prioMap[c.priority] = (prioMap[c.priority] || 0) + 1;
        });

        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('Workload Categorization Distribution:');
        doc.fontSize(9).font('Helvetica').fillColor('#475569');
        
        let catText = Object.keys(catMap).map(k => `${k}: ${catMap[k]}`).join('  |  ');
        let prioText = Object.keys(prioMap).map(k => `${k}: ${prioMap[k]}`).join('  |  ');
        
        doc.text(`By Category: ${catText || 'No category logs found'}`);
        doc.text(`By Priority Level: ${prioText || 'No priority logs found'}`);
        doc.moveDown(1.5);
      }

      // List Details Section
      doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text(`Complaint Details Listing (${total} Records):`);
      doc.moveDown(0.5);

      complaints.forEach((c, idx) => {
        // Prevent layout spilling over pages awkwardly
        if (doc.y > 680) {
          doc.addPage();
        }
        
        doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text(`${idx + 1}. [ID: ${c.complaintId}] - ${c.title}`);
        
        doc.font('Helvetica').fontSize(9).fillColor('#475569');
        let assignmentInfo = '';
        if (c.assignedOfficer && c.assignedOfficer.fullName) {
          assignmentInfo = ` | Officer: ${c.assignedOfficer.fullName}`;
        }
        
        doc.text(`   Category: ${c.category} | Priority: ${c.priority} | Status: ${c.status}${assignmentInfo}`);
        
        if (c.createdAt) {
          doc.text(`   Reported Date: ${new Date(c.createdAt).toLocaleDateString()}`);
        }
        
        if (reportType === 'resolution' || reportType === 'performance' || reportType === 'all') {
          if (c.status === 'Resolved' || c.status === 'Closed') {
            const resEvent = c.timeline && c.timeline.find(t => t.status === 'Resolved');
            if (resEvent && resEvent.timestamp) {
              doc.text(`   Completed Date: ${new Date(resEvent.timestamp).toLocaleDateString()}`);
            }
            if (c.resolutionNotes) {
              doc.text(`   Resolution Notes: ${c.resolutionNotes}`);
            }
          }
        }
        doc.moveDown(0.5);
      });

      // Footer styling
      doc.moveDown(2);
      if (doc.y > 700) {
        doc.addPage();
      }
      doc.fontSize(8).fillColor('#94a3b8').text('Generated automatically by Civic Resolve Governance Platform. Confidential municipal document.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(`/reports/${fileName}`);
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateExcelReport,
  generatePDFReport,
  generateSummaryPDFReport,
};
