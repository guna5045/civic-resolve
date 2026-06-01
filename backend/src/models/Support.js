const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need when supported
  }
);

// Enforce unique support: a citizen can support a complaint only once
supportSchema.index({ user: 1, complaint: 1 }, { unique: true });

const Support = mongoose.model('Support', supportSchema);
module.exports = Support;
