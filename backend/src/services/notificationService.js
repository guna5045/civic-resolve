const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./emailService');

const createNotification = async (recipientId, title, message, type = 'System Alert') => {
  return await Notification.create({
    recipient: recipientId,
    title,
    message,
    type,
    isRead: false,
  });
};

const markRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw new Error('Notification not found');

  notification.isRead = true;
  return await notification.save();
};

const markAllRead = async (userId) => {
  return await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

const broadcastNotification = async (title, message, type = 'System Alert', roles = []) => {
  const users = await User.find({ role: { $in: roles } });
  const notificationPromises = users.map(user => 
    createNotification(user._id, title, message, type)
  );
  return await Promise.all(notificationPromises);
};

module.exports = {
  createNotification,
  markRead,
  markAllRead,
  sendEmail,
  broadcastNotification,
};
