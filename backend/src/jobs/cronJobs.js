const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

/**
 * Periodically checks for complaints that have been open for too long without resolution.
 * Auto-escalates issues in "Reported" or "Assigned" status for more than 7 days.
 */
const startEscalationJob = () => {
  // Run checks daily (24 hours)
  const intervalTime = 24 * 60 * 60 * 1000;

  setInterval(async () => {
    console.log('Running Daily SLA Escalation Audit Job...');
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const User = require('../models/User');

      // 1. Pending > 15 Days -> Create Escalation, Notify Admin
      const pending15 = await Complaint.find({
        status: { $in: ['Submitted', 'Under Review', 'Assigned', 'In Progress'] },
        createdAt: { $lte: fifteenDaysAgo, $gt: thirtyDaysAgo },
      }).populate('department');

      for (const complaint of pending15) {
        complaint.status = 'Escalated';
        complaint.timeline.push({
          status: 'Escalated',
          title: 'SLA Escalation (>15 Days Pending)',
          description: 'This issue has exceeded the 15-day SLA response threshold and has been escalated for priority attention.',
          timestamp: new Date(),
        });
        await complaint.save();

        // Notify Citizen
        await Notification.create({
          recipient: complaint.citizen,
          title: 'Complaint Escalated (SLA Warning)',
          message: `Your complaint "${complaint.title}" has been escalated due to exceeding 15 days pending.`,
          type: 'Complaint Status',
        });

        // Notify Admins
        const admins = await User.find({ role: 'Admin' });
        for (const admin of admins) {
          await Notification.create({
            recipient: admin._id,
            title: `SLA Warning Breach: ${complaint.complaintId}`,
            message: `Complaint "${complaint.title}" has been pending for over 15 days without resolution. Reassignment required.`,
            type: 'System Alert',
          });
        }

        // Log administrative event
        await AuditLog.create({
          action: 'SLA 15 Days Escalation',
          module: 'SLA Escalations',
          description: `Complaint ${complaint.complaintId} auto-escalated after 15 days pending.`,
        }).catch(e => console.error(e));
      }

      // 2. Pending > 30 Days -> Mark High Risk (Critical), Notify Department Head & Admin
      const pending30 = await Complaint.find({
        status: { $in: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Escalated'] },
        createdAt: { $lte: thirtyDaysAgo },
      }).populate('department');

      for (const complaint of pending30) {
        complaint.status = 'Escalated';
        complaint.priority = 'Critical';
        complaint.isCritical = true;
        complaint.timeline.push({
          status: 'Escalated',
          title: 'SLA High-Risk Escalation (>30 Days)',
          description: 'This issue has exceeded the 30-day threshold. It has been marked as Critical / High Risk.',
          timestamp: new Date(),
        });
        await complaint.save();

        // Notify Citizen
        await Notification.create({
          recipient: complaint.citizen,
          title: 'Complaint Marked High Risk',
          message: `Your complaint "${complaint.title}" has been flagged as Critical / High Risk due to exceeding 30 days pending.`,
          type: 'Complaint Status',
        });

        // Notify Assigned Officer
        if (complaint.assignedOfficer) {
          await Notification.create({
            recipient: complaint.assignedOfficer,
            title: 'Critical SLA Breach Warning ⚠️',
            message: `URGENT: Complaint ID: ${complaint.complaintId} has exceeded 30 days pending. It is now flagged as Critical/High-Risk.`,
            type: 'System Alert',
          });
        }

        // Notify Admins
        const admins = await User.find({ role: 'Admin' });
        for (const admin of admins) {
          await Notification.create({
            recipient: admin._id,
            title: `SLA Severe Breach: ${complaint.complaintId}`,
            message: `Complaint "${complaint.title}" has breached the 30-day SLA and is flagged as High-Risk. Department Head: ${complaint.department?.departmentHead || 'N/A'}.`,
            type: 'System Alert',
          });
        }

        // Log administrative event
        await AuditLog.create({
          action: 'SLA 30 Days High Risk',
          module: 'SLA Escalations',
          description: `Complaint ${complaint.complaintId} flagged as Critical / High Risk after 30 days pending.`,
        }).catch(e => console.error(e));
      }

      // 3. Critical Priority Not Assigned -> Immediate Escalation
      const criticalUnassigned = await Complaint.find({
        priority: 'Critical',
        assignedOfficer: null,
        status: { $ne: 'Escalated' },
      });

      for (const complaint of criticalUnassigned) {
        complaint.status = 'Escalated';
        complaint.timeline.push({
          status: 'Escalated',
          title: 'Immediate Escalation (Critical Unassigned)',
          description: 'This critical complaint remains unassigned and has been immediately escalated.',
          timestamp: new Date(),
        });
        await complaint.save();

        // Notify Admins
        const admins = await User.find({ role: 'Admin' });
        for (const admin of admins) {
          await Notification.create({
            recipient: admin._id,
            title: `Immediate Escalation: ${complaint.complaintId}`,
            message: `Complaint "${complaint.title}" is Critical and unassigned. Immediate routing required.`,
            type: 'System Alert',
          });
        }
      }
    } catch (error) {
      console.error('Escalation Job Error:', error);
    }
  }, intervalTime);
};

module.exports = {
  startEscalationJob,
};
