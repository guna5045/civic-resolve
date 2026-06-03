const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resends: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire pending registrations after 10 minutes (600 seconds)
pendingUserSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);
module.exports = PendingUser;
