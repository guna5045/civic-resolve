const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    type: {
      type: String,
      enum: ['Complaint Status', 'Badge Earned', 'Points Added', 'System Alert', 'Officer Assignment'],
      default: 'System Alert',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.post('save', async function (doc) {
  try {
    const User = mongoose.model('User');
    const recipientUser = await User.findById(doc.recipient);
    if (recipientUser && recipientUser.email) {
      const { sendEmail } = require('../services/emailService');
      const subject = `Civic Resolve Update: ${doc.title}`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background-color: #0f172a; color: #f1f5f9;">
          <h2 style="color: #8b5cf6; margin-top: 0;">Civic Resolve</h2>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
          <h3 style="color: #f1f5f9;">${doc.title}</h3>
          <p style="color: #cbd5e1; line-height: 1.6; font-size: 14px;">${doc.message}</p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 11px; text-align: center;">This is an automated notification from the Civic Resolve municipal service tracking system.</p>
        </div>
      `;
      // Send email asynchronously
      sendEmail(recipientUser.email, subject, htmlContent).catch(err => {
        console.error('Post-save email dispatch failed:', err);
      });
    }
  } catch (err) {
    console.error('Notification post-save hook error:', err);
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
