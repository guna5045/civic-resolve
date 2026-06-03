const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Support = require('../models/Support');
const bcrypt = require('bcryptjs');

const calculateLevel = (points) => {
  if (points >= 1000) return 5; // Civic Champion
  if (points >= 600) return 4;  // City Contributor
  if (points >= 300) return 3;  // Community Guardian
  if (points >= 100) return 2;  // Community Helper
  return 1; // Civic Starter
};

const createUser = async (userData) => {
  const { fullName, email, mobile, password, role, departmentId } = userData;
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new Error('User already exists');
  }

  return await User.create({
    fullName,
    email,
    mobile,
    passwordHash: password, // Pre-save hook in User model will hash this automatically exactly once
    role: role || 'Citizen',
    department: departmentId || null,
    points: 0,
    level: 1,
  });
};

const updateProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (data.fullName) user.fullName = data.fullName;
  if (data.mobile) user.mobile = data.mobile;
  if (data.profilePhoto) user.profilePhoto = data.profilePhoto;

  return await user.save();
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.matchPassword(oldPassword);
  if (!isMatch) throw new Error('Incorrect current password');

  user.passwordHash = newPassword; // Hook hashes it on save
  return await user.save();
};

const getUserStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const complaintsCount = await Complaint.countDocuments({ citizen: userId });
  const resolvedCount = await Complaint.countDocuments({ citizen: userId, status: { $in: ['Resolved', 'Closed'] } });
  
  // count supports
  const supportsCount = await Support.countDocuments({ user: userId });

  return {
    points: user.points,
    level: user.level,
    complaintsCount,
    resolvedCount,
    supportsCount,
    streak: user.activityStreak || 0,
  };
};

module.exports = {
  createUser,
  updateProfile,
  changePassword,
  getUserStats,
  calculateLevel,
};
