const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    departmentHead: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    category: {
      type: String,
      enum: ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'],
      default: 'Other',
    },
    color: {
      type: String,
      default: '#3b82f6',
    },
    icon: {
      type: String,
      default: 'Layers',
    },
  },
  {
    timestamps: true,
  }
);

const Department = mongoose.model('Department', departmentSchema);
module.exports = Department;
