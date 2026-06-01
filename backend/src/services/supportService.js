const Support = require('../models/Support');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calculateLevel } = require('./userService');

const validateSupport = async (userId, complaintId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error('Complaint not found');

  if (String(complaint.citizen) === String(userId)) {
    throw new Error('You cannot support your own complaint');
  }

  const alreadySupported = await Support.findOne({ user: userId, complaint: complaintId });
  if (alreadySupported) {
    throw new Error('You are already supporting this complaint');
  }

  return complaint;
};

const createSupport = async (userId, complaintId) => {
  const complaint = await validateSupport(userId, complaintId);

  // Create support log
  await Support.create({ user: userId, complaint: complaintId });

  // Increment complaint counts
  complaint.supportCount = (complaint.supportCount || 0) + 1;
  await complaint.save();

  // Award points to citizen: +5 XP
  const user = await User.findById(userId);
  if (user) {
    const originalLevel = user.level;
    user.points += 5;
    user.level = calculateLevel(user.points);
    await user.save();
    
    if (user.level !== originalLevel) {
      await Notification.create({
        recipient: userId,
        title: 'Level Up Alert! 📈',
        message: `Congratulations! Your civic reputation level has increased to Level ${user.level}.`,
        type: 'Points Added',
      });
    }
  }

  // Notify reporter
  await Notification.create({
    recipient: complaint.citizen,
    title: 'New Support for Your Issue',
    message: `Another citizen supported your issue "${complaint.title}". Support Count: ${complaint.supportCount}`,
    type: 'Complaint Status',
  });

  return complaint;
};

const removeSupport = async (userId, complaintId) => {
  const support = await Support.findOne({ user: userId, complaint: complaintId });
  if (!support) throw new Error('Support relationship not found');

  await Support.deleteOne({ _id: support._id });

  const complaint = await Complaint.findById(complaintId);
  if (complaint) {
    complaint.supportCount = Math.max(0, (complaint.supportCount || 0) - 1);
    await complaint.save();
  }

  // Deduct points: -5 XP
  const user = await User.findById(userId);
  if (user) {
    user.points = Math.max(0, user.points - 5);
    user.level = calculateLevel(user.points);
    await user.save();
  }

  return complaint;
};

const updateCounts = async (complaintId) => {
  const count = await Support.countDocuments({ complaint: complaintId });
  await Complaint.findByIdAndUpdate(complaintId, { supportCount: count });
  return count;
};

module.exports = {
  validateSupport,
  createSupport,
  removeSupport,
  updateCounts,
};
