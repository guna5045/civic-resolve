const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
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
      required: function() {
        return this.authMethod === 'Local';
      },
      trim: true,
    },
    passwordHash: {
      type: String,
      required: function() {
        return this.authMethod === 'Local';
      },
    },
    role: {
      type: String,
      enum: ['Citizen', 'Department Officer', 'Admin'],
      default: 'Citizen',
    },
    googleId: {
      type: String,
      default: '',
    },
    authMethod: {
      type: String,
      enum: ['Local', 'Google', 'Demo'],
      default: 'Local',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null, // Relevant for Department Officers
    },
    departmentName: {
      type: String,
      default: '',
    },
    points: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    earnedBadges: [
      {
        badge: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Badge',
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Inactive'],
      default: 'Active',
    },
    activityStreak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    activityDates: [
      {
        type: Date,
      },
    ],
    monthlyParticipationPoints: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password match
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Hook to hash password before saving if it has been modified
userSchema.pre('save', async function (next) {
  if (!this.passwordHash || !this.isModified('passwordHash')) {
    return next();
  }
  // Skip hashing if it already has a bcrypt signature (like $2a$, $2b$, or $2y$)
  if (
    this.passwordHash.startsWith('$2a$') ||
    this.passwordHash.startsWith('$2b$') ||
    this.passwordHash.startsWith('$2y$')
  ) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
