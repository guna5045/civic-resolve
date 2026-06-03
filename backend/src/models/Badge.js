const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Badge name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Badge description is required'],
    },
    icon: {
      type: String,
      default: '', // Store icon slug or URL
    },
    requirement: {
      type: String,
      required: [true, 'Requirement description is required'],
    },
    pointsReward: {
      type: Number,
      default: 100,
    },
    isSeasonal: {
      type: Boolean,
      default: false,
    },
    seasonalMonth: {
      type: Number, // 0-11 for month, or custom code
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Badge = mongoose.model('Badge', badgeSchema);
module.exports = Badge;
