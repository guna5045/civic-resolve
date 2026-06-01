const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['PDF', 'Excel'],
      required: [true, 'Report type is required'],
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Generating user is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'Report file URL is required'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need generated time
  }
);

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
