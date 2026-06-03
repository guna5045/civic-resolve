const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      required: [true, 'Complaint ID is required'],
    },
    trackingId: {
      type: String,
      unique: true,
      required: [true, 'Tracking ID is required'],
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    aiSummary: {
      type: String,
      default: '',
    },
    aiReason: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    originalPriority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    images: [
      {
        type: String,
      },
    ],
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignmentTimestamp: {
      type: Date,
      default: null,
    },
    assignedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    supportCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Assigned', 'Inspection', 'In Progress', 'Resolved', 'Closed', 'Escalated', 'Rejected', 'Clarification Required', 'Verified', 'Verified By Officer', 'Work Started', 'Rejected By Officer', 'Reassigned', 'Information Clarified', 'Cancelled'],
      default: 'Submitted',
    },
    verifiedByOfficer: {
      type: Boolean,
      default: false,
    },
    verificationTimestamp: {
      type: Date,
      default: null,
    },
    verificationStatus: {
      type: String,
      default: '',
    },
    workStartTimestamp: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: '',
    },
    rejectionImages: [
      {
        type: String,
      },
    ],
    correctionsRequired: {
      type: String,
      default: '',
    },
    reasonForReturn: {
      type: String,
      default: '',
    },
    inspectionNotes: {
      type: String,
      default: '',
    },
    inspectionObservations: {
      type: String,
      default: '',
    },
    inspectionFindings: {
      type: String,
      default: '',
    },
    inspectionTimestamp: {
      type: Date,
      default: null,
    },
    inspectionImages: [
      {
        type: String,
      },
    ],
    progressNotes: {
      type: String,
      default: '',
    },

    progressFieldUpdates: {
      type: String,
      default: '',
    },
    progressTimestamp: {
      type: Date,
      default: null,
    },
    progressImages: [
      {
        type: String,
      },
    ],
    completionTimestamp: {
      type: Date,
      default: null,
    },
    resolutionSummary: {
      type: String,
      default: '',
    },
    resolutionImages: [
      {
        type: String,
      },
    ],
    afterImages: [
      {
        type: String,
      },
    ],
    resolutionNotes: {
      type: String,
      default: '',
    },
    adminRemarks: {
      type: String,
      default: '',
    },
    clarificationResponse: {
      type: String,
      default: '',
    },
    isCritical: {
      type: Boolean,
      default: false,
    },
    timeline: [timelineEventSchema],
  },
  {
    timestamps: true,
  }
);

// Pre-validate or pre-save hooks can be added here if needed to auto-populate ticket prefixes
const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
