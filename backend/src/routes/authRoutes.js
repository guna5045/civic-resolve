const express = require('express');
const router = express.Router();
const { 
  registerCitizen, 
  verifyOtp,
  resendOtp,
  googleAuth,
  loginUser,
  getUserProfile,
  logoutUser,
  refreshToken,
  demoLogin
} = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validations/authValidation');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', validateRegister, registerCitizen);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/google', googleAuth);
router.post('/login', validateLogin, loginUser);
router.post('/demo', demoLogin);
router.get('/profile', protect, getUserProfile);
router.get('/me', protect, getUserProfile);
router.post('/logout', protect, logoutUser);
router.post('/refresh-token', protect, refreshToken);

module.exports = router;
