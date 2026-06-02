const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role, 
      department: user.department 
    }, 
    process.env.JWT_SECRET || 'your_jwt_super_secret_key_here', 
    {
      expiresIn: '30d',
    }
  );
};

/**
 * @desc    Register a new Citizen
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerCitizen = async (req, res) => {
  const { fullName, email, mobile, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create citizen user
    const user = await User.create({
      fullName,
      email,
      mobile,
      passwordHash: password, // Pre-save hook in User model will hash this
      role: 'Citizen',
      points: 0,
      level: 1,
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          points: user.points,
          level: user.level,
          token: generateToken(user),
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Login User (Citizen, Officer, Admin)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { identifier, password, role } = req.body; // 'identifier' matches Email / Officer ID / Admin ID

  try {
    // Find user by email (which acts as Email, Officer ID or Admin ID)
    const user = await User.findOne({ email: identifier });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
    }

    // Verify role matches selected toggle
    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized: User is registered as a ${user.role}, not a ${role}`,
      });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended' });
    }

    // Match password
    const isMatch = await user.matchPassword(password);

    if (isMatch) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department,
          points: user.points,
          level: user.level,
          profilePhoto: user.profilePhoto,
          token: generateToken(user),
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Current Logged in User Profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .populate('department')
      .populate('earnedBadges.badge');
    
    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Logout User
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Refresh Session Token
 * @route   POST /api/auth/refresh-token
 * @access  Private
 */
const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, token: generateToken(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Demo Login (No credentials required)
 * @route   POST /api/auth/demo
 * @access  Public
 */
const demoLogin = async (req, res) => {
  const { role } = req.body;

  if (!['Citizen', 'Department Officer', 'Admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role specified for demo login' });
  }

  let email, fullName;
  if (role === 'Admin') {
    email = 'demo.admin@civicresolve.gov';
    fullName = 'Demo Administrator';
  } else if (role === 'Department Officer') {
    email = 'demo.officer@civicresolve.gov';
    fullName = 'Demo Officer';
  } else {
    email = 'demo.citizen@civicresolve.gov';
    fullName = 'Demo Citizen';
  }

  try {
    let user = await User.findOne({ email });

    if (!user) {
      let departmentId = null;
      if (role === 'Department Officer') {
        const Department = require('../models/Department');
        const dept = await Department.findOne({ status: 'Active' });
        if (dept) {
          departmentId = dept._id;
        } else {
          const fallbackDept = await Department.findOne({});
          if (fallbackDept) {
            departmentId = fallbackDept._id;
          }
        }
      }

      user = await User.create({
        fullName,
        email,
        mobile: '555-0199',
        passwordHash: 'demopassword',
        role,
        department: departmentId,
        points: role === 'Citizen' ? 120 : 0,
        level: role === 'Citizen' ? 2 : 1,
        status: 'Active',
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        points: user.points,
        level: user.level,
        profilePhoto: user.profilePhoto,
        token: generateToken(user),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerCitizen,
  loginUser,
  getUserProfile,
  logoutUser,
  refreshToken,
  demoLogin,
};
