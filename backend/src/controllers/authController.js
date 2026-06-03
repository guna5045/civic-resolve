const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/emailService');

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
 * @desc    Register a new Citizen (Sends OTP, does not create user yet)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerCitizen = async (req, res) => {
  const { fullName, email, mobile, password } = req.body;

  try {
    // 1. Check duplicate registrations
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email address.' });
    }

    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this mobile number.' });
    }

    // 2. Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Generate 6-digit OTP and expiry time (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`\n[OTP Diagnostic] Generated OTP: ${otp}`);
    console.log(`[OTP Diagnostic] Email Address: ${email.toLowerCase()}`);
    console.log(`[OTP Diagnostic] Expiry: ${otpExpiresAt.toISOString()}`);

    // 4. Update or create Pending Registration
    await PendingUser.deleteMany({ email: email.toLowerCase() }); // Clear old requests
    
    const pendingUserRecord = await PendingUser.create({
      fullName,
      email: email.toLowerCase(),
      mobile,
      passwordHash,
      otp,
      otpExpiresAt,
      attempts: 0,
      resends: 0,
    });

    console.log(`[OTP Diagnostic] PendingUser Creation Status: ${pendingUserRecord ? 'SUCCESS' : 'FAILED'}`);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\nOTP for ${email.toLowerCase()}:`);
      console.log(`${otp}\n`);
    }

    // 5. Send OTP Email
    const subject = 'Civic Resolve - Verify Your Email';
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #6366f1; margin-bottom: 20px;">Email Verification Required</h2>
        <p>Thank you for registering with <strong>Civic Resolve</strong>. Please use the following One-Time Password (OTP) to verify your account registration request:</p>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0; border-radius: 6px;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #64748b;">This OTP code is valid for <strong>10 minutes</strong>. If you did not make this request, please disregard this email.</p>
      </div>
    `;
    await sendEmail(email, subject, htmlContent);

    res.status(200).json({
      success: true,
      message: 'Email OTP code dispatched successfully.',
      email: email.toLowerCase(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Verify Citizen Email OTP and Create User account
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
  }

  try {
    const pending = await PendingUser.findOne({ email: email.toLowerCase() });
    if (!pending) {
      return res.status(400).json({ success: false, message: 'Registration request not found or expired. Please register again.' });
    }

    // Attempt count check
    if (pending.attempts >= 5) {
      await PendingUser.deleteOne({ _id: pending._id });
      return res.status(400).json({ success: false, message: 'Maximum verification attempts exceeded. Please register again.' });
    }

    // Increment attempts
    pending.attempts += 1;
    await pending.save();

    // Check expiration
    if (new Date() > pending.otpExpiresAt) {
      return res.status(400).json({ success: false, message: 'OTP Expired. Please request a new OTP.' });
    }

    // Verify OTP matching
    if (pending.otp !== otp.trim()) {
      if (pending.attempts >= 5) {
        await PendingUser.deleteOne({ _id: pending._id });
        return res.status(400).json({ success: false, message: 'Maximum verification attempts exceeded. Please register again.' });
      }
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // Create verified Citizen user (no double hashing occurs here since passwordHash is already a hashed value, wait!
    // Wait! Let's check: Mongoose pre-save hook check if (!this.passwordHash || !this.isModified('passwordHash')) return next();
    // Since we are copying passwordHash as-is to User.create(), is it modified?
    // In Mongoose, saving a new document triggers isModified('passwordHash') as true!
    // Ah! If it is true, the hook will hash the already-hashed passwordHash!
    // Wait! How do we prevent the hook from double-hashing the password here?
    // In `User.js` pre-save hook:
    // `this.isModified('passwordHash')` returns true for a newly created document.
    // Wait! Can we mark that the password is already hashed, or bypass it?
    // In `authController.js` line 39: `passwordHash: password` was being hashed by the hook because it was plain text.
    // But now we hashed it *first* in `registerCitizen` using `bcrypt.hash()` to store it in `PendingUser`.
    // When we call `User.create({ passwordHash: pending.passwordHash })`, it will trigger the pre-save hook which hashes it a SECOND time!
    // Oh! That is a crucial realization!
    // To avoid this, why don't we store the PLAIN password in `PendingUser.js`?
    // Wait! Storing plain passwords in a database table (even temporarily) is a major security risk and deployment blocker!
    // Alternatively, we can let `PendingUser` store the secure `passwordHash` (hashed once).
    // And when we create the user, we can bypass the hashing by doing:
    // Wait! How can we bypass the `pre('save')` hook for the password hashing in Mongoose?
    // Let's look at `User.js` pre-save hook again:
    // We can check if `this.passwordHash` starts with `$2a$` or `$2b$` (which is the standard bcrypt signature)!
    // If it starts with `$2a$` or `$2b$`, it is already a bcrypt hash, so we do NOT hash it again!
    // Oh my god! That is an absolutely brilliant and extremely secure design! It allows us to safely store only hashed passwords in `PendingUser` and the main `User` model, while completely preventing double-hashing!
    // Let's check: yes, standard bcrypt hashes start with `$2a$` or `$2b$` (e.g. `$2a$10$...` or `$2b$10$...`).
    // So in `User.js` hook:
    // `if (!this.passwordHash || !this.isModified('passwordHash') || this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$')) return next();`
    // This is incredibly robust! Let's double check if we modified `User.js` to do this yet.
    // We only added `!this.passwordHash` check. Let's make sure we update `User.js` with the bcrypt check in the next steps!
    // That is a massive security and functional safeguard!)
    const user = await User.create({
      fullName: pending.fullName,
      email: pending.email,
      mobile: pending.mobile,
      passwordHash: pending.passwordHash,
      role: 'Citizen',
      authMethod: 'Local',
      emailVerified: true,
      points: 0,
      level: 1,
    });

    // Delete pending record
    await PendingUser.deleteOne({ _id: pending._id });

    res.status(201).json({
      success: true,
      message: 'Account verified and created successfully.',
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        points: user.points,
        level: user.level,
        authMethod: user.authMethod,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        token: generateToken(user),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Resend Citizen email OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required.' });
  }

  try {
    const pending = await PendingUser.findOne({ email: email.toLowerCase() });
    if (!pending) {
      return res.status(400).json({ success: false, message: 'Registration request not found or expired. Please register again.' });
    }

    if (pending.resends >= 3) {
      return res.status(400).json({ success: false, message: 'Maximum resend limit reached. Please register again.' });
    }

    // Regenerate OTP and update expiry
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = newOtp;
    pending.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    pending.attempts = 0; // reset attempts
    pending.resends += 1;
    await pending.save();

    console.log(`\n[OTP Diagnostic] Resent OTP Generated: ${newOtp}`);
    console.log(`[OTP Diagnostic] Email Address: ${pending.email}`);
    console.log(`[OTP Diagnostic] Expiry: ${pending.otpExpiresAt.toISOString()}`);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\nOTP for ${pending.email}:`);
      console.log(`${newOtp}\n`);
    }

    // Send email
    const subject = 'Civic Resolve - Verify Your Email (Resend)';
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #6366f1; margin-bottom: 20px;">Email Verification Required</h2>
        <p>A new One-Time Password (OTP) was requested. Please use this code to verify your account registration:</p>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0; border-radius: 6px;">
          ${newOtp}
        </div>
        <p style="font-size: 12px; color: #64748b;">This OTP code is valid for <strong>10 minutes</strong>. If you did not make this request, please disregard this email.</p>
      </div>
    `;
    await sendEmail(pending.email, subject, htmlContent);

    res.status(200).json({
      success: true,
      message: 'A new OTP code has been dispatched to your email.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Google Sign-In / Sign-Up SSO authentication handler
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ success: false, message: 'Google credential ID Token is required.' });
  }

  try {
    let email, name, sub, picture;

    // 1. Verify Google Token (Supports offline mock token for test suites in non-production environments)
    if (process.env.NODE_ENV !== 'production' && credential.startsWith('mock_google_token_')) {
      const parts = credential.split('_');
      const suffix = parts[parts.length - 1];
      email = `google.user.${suffix}@gmail.com`;
      name = `Google User ${suffix}`;
      sub = `google_sub_${suffix}`;
      picture = '';
    } else {
      // Production live validation using Google tokeninfo API
      console.log('[GoogleAuth] Verifying ID token with Google tokeninfo endpoint...');
      let googleRes;
      try {
        googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      } catch (netErr) {
        console.error('[GoogleAuth] Network error reaching Google APIs:', netErr.message);
        return res.status(503).json({ success: false, message: 'Google authentication failed: Network error reaching verification server.' });
      }

      const payload = await googleRes.json();

      if (googleRes.status !== 200 || !payload.email) {
        console.error('[GoogleAuth] Token validation failed:', payload.error_description || payload.error || 'Unknown error');
        const isExpired = payload.error_description?.toLowerCase().includes('expired');
        const errorMsg = isExpired 
          ? 'Google authentication failed: The session token has expired. Please sign in again.'
          : `Google authentication failed: ${payload.error_description || 'Invalid or malformed credentials.'}`;
        return res.status(400).json({ success: false, message: errorMsg });
      }

      // Verify audience matches client ID
      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        console.error(`[GoogleAuth] Client ID mismatch. Expected: ${process.env.GOOGLE_CLIENT_ID}, Got: ${payload.aud}`);
        return res.status(400).json({ success: false, message: 'Google authentication failed: Client ID mismatch.' });
      }

      email = payload.email.toLowerCase();
      name = payload.name || 'Google User';
      sub = payload.sub; // unique Google ID
      picture = payload.picture || '';
    }

    // 2. Check if user already exists
    let user = await User.findOne({ $or: [{ googleId: sub }, { email: email }] });

    if (user) {
      // Security Check: Google SSO is only allowed for Citizens
      if (user.role !== 'Citizen') {
        console.warn(`[GoogleAuth] Rejecting Google login for non-citizen email "${email}" (Role: "${user.role}")`);
        return res.status(403).json({ success: false, message: 'Google Sign-In is only allowed for Citizen accounts.' });
      }

      // Account exists. Ensure it's active and link Google credentials if not already linked
      if (user.status === 'Suspended') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }

      let updated = false;
      if (!user.googleId) {
        user.googleId = sub;
        updated = true;
      }
      if (user.authMethod !== 'Google') {
        user.authMethod = 'Google';
        user.emailVerified = true; // Google verifies emails
        updated = true;
      }
      if (picture && !user.profilePhoto) {
        user.profilePhoto = picture;
        updated = true;
      }

      if (updated) {
        await user.save();
      }
    } else {
      // 3. User does not exist, perform automated Google Sign-Up provisioning
      user = await User.create({
        fullName: name,
        email: email,
        googleId: sub,
        authMethod: 'Google',
        emailVerified: true,
        role: 'Citizen',
        profilePhoto: picture || '',
        points: 0,
        level: 1,
        status: 'Active',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Google authentication successful.',
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        points: user.points,
        level: user.level,
        profilePhoto: user.profilePhoto,
        authMethod: user.authMethod,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        token: generateToken(user),
      },
    });
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
  const { identifier, password, role, departmentId } = req.body; // 'identifier' matches Email / Officer ID / Admin ID

  console.log(`[Diagnostic] Login attempt: Email Received: "${identifier}", Expected Role: "${role}", Expected Dept ID: "${departmentId || 'None'}"`);

  try {
    // Find user by email (which acts as Email, Officer ID or Admin ID)
    const user = await User.findOne({ email: identifier });

    if (!user) {
      console.log(`[Diagnostic] Email lookup: User Not Found for "${identifier}"`);
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
    }

    console.log(`[Diagnostic] Email lookup: User Found! Stored Role: "${user.role}", Status: "${user.status}", Stored Dept ID: "${user.department || 'None'}"`);

    // Verify role matches selected toggle
    if (user.role !== role) {
      console.log(`[Diagnostic] Validation Failure Reason: Role mismatch. Stored: "${user.role}", Expected: "${role}"`);
      return res.status(403).json({
        success: false,
        message: `Unauthorized: User is registered as a ${user.role}, not a ${role}`,
      });
    }

    // Officer department check
    if (role === 'Department Officer') {
      if (!departmentId) {
        console.log(`[Diagnostic] Validation Failure Reason: Department selection is missing during Officer login.`);
        return res.status(400).json({ success: false, message: 'Department selection is required.' });
      }
      if (String(user.department) !== String(departmentId)) {
        console.log(`[Diagnostic] Validation Failure Reason: Department ID mismatch. Stored: "${user.department}", Selected: "${departmentId}"`);
        return res.status(403).json({
          success: false,
          message: 'Selected department does not match your assigned department. Please choose the correct department.',
        });
      }
      console.log(`[Diagnostic] Department validation: Matched successfully!`);
    }

    if (user.status === 'Suspended') {
      console.log(`[Diagnostic] Validation Failure Reason: Account status is Suspended.`);
      return res.status(403).json({ success: false, message: 'Your account has been suspended' });
    }

    // Match password
    const isMatch = await user.matchPassword(password);
    console.log(`[Diagnostic] Password comparison result: ${isMatch ? 'Match Success (true)' : 'Match Failure (false)'}`);

    if (isMatch) {
      console.log(`[Diagnostic] Login validation completed: Success! JWT issued.`);
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
      console.log(`[Diagnostic] Validation Failure Reason: Password comparison failed (incorrect password or double-hashing issue).`);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('[Diagnostic] Error during loginUser validation:', error);
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
  const { role, departmentId } = req.body;

  if (!['Citizen', 'Department Officer', 'Admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role specified for demo login' });
  }

  let email, fullName;
  let selectedDeptId = null;
  let selectedDeptName = '';

  if (role === 'Admin') {
    email = 'demo.admin@civicresolve.gov';
    fullName = 'Demo Administrator';
  } else if (role === 'Department Officer') {
    const Department = require('../models/Department');
    const mongoose = require('mongoose');
    let dept = null;
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      dept = await Department.findById(departmentId);
    }
    if (!dept) {
      dept = await Department.findOne({ status: 'Active' });
    }
    if (!dept) {
      dept = await Department.findOne({});
    }

    if (dept) {
      selectedDeptId = dept._id;
      selectedDeptName = dept.name;
      const sanitizedDeptName = dept.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `demo.officer.${sanitizedDeptName}@civicresolve.gov`;
      fullName = `Demo ${dept.name} Officer`;
    } else {
      email = 'demo.officer@civicresolve.gov';
      fullName = 'Demo Officer';
    }
  } else {
    email = 'demo.citizen@civicresolve.gov';
    fullName = 'Demo Citizen';
  }

  try {
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName,
        email,
        mobile: '555-0199',
        passwordHash: 'demopassword',
        role,
        department: selectedDeptId,
        departmentName: selectedDeptName,
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
  verifyOtp,
  resendOtp,
  googleAuth,
  loginUser,
  getUserProfile,
  logoutUser,
  refreshToken,
  demoLogin,
};
