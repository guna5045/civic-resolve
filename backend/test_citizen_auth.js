require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const PendingUser = require('./src/models/PendingUser');

const API_BASE = 'http://127.0.0.1:5000/api/auth';
const TEST_EMAIL = 'test.citizen.integration@gmail.com';
const TEST_MOBILE = '9876543210';
const TEST_PASSWORD = 'Password@123';
const TEST_NAME = 'Test Citizen Integration';

async function runTests() {
  console.log('=== CITIZEN AUTHENTICATION INTEGRATION TESTS ===');

  // 1. Connect to DB
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic_resolve';
  console.log(`Connecting to MongoDB for test verification and cleanup...`);
  await mongoose.connect(uri);
  console.log('Connected successfully.');

  try {
    // Cleanup previous test state
    await User.deleteMany({ email: TEST_EMAIL });
    await PendingUser.deleteMany({ email: TEST_EMAIL });
    await User.deleteMany({ email: 'google.user.integrationtest@gmail.com' });
    console.log('Cleanup completed.\n');

    // -------------------------------------------------------------
    // SCENARIO 1 & 2: Register, invalid OTPs, and limit verification (5 attempts)
    // -------------------------------------------------------------
    console.log('--- Scenario 1: Citizen Registration ---');
    const regRes = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: TEST_NAME,
        email: TEST_EMAIL,
        mobile: TEST_MOBILE,
        password: TEST_PASSWORD,
      }),
    });
    const regData = await regRes.json();
    console.log('Registration response status:', regRes.status);
    console.log('Registration response body:', regData);
    if (!regData.success) {
      throw new Error(`Registration failed: ${regData.message}`);
    }

    // Verify pending user created in DB
    let pending = await PendingUser.findOne({ email: TEST_EMAIL });
    if (!pending) {
      throw new Error('PendingUser not found in DB after registration.');
    }
    console.log(`PendingUser successfully created in DB. Current OTP: ${pending.otp}`);

    console.log('\n--- Scenario 2: Invalid OTP Attempt & Limit (5 Attempts) ---');
    // Try incorrect OTP 5 times
    for (let i = 1; i <= 5; i++) {
      const verifyRes = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, otp: '000000' }),
      });
      const verifyData = await verifyRes.json();
      console.log(`Attempt ${i} verify response status:`, verifyRes.status, '| success:', verifyData.success, '| message:', verifyData.message);
      
      if (i < 5) {
        if (verifyData.success || !verifyData.message.includes('Invalid OTP')) {
          throw new Error(`Unexpected verification response on attempt ${i}`);
        }
      } else {
        // 5th attempt should lock out / delete the registration
        if (verifyData.success || !verifyData.message.includes('attempts exceeded')) {
          throw new Error('5th attempt did not trigger maximum verification attempts limit');
        }
      }
    }

    // Verify pending user deleted in DB
    pending = await PendingUser.findOne({ email: TEST_EMAIL });
    if (pending) {
      throw new Error('PendingUser record was not deleted after 5 failed verification attempts.');
    }
    console.log('Pending user successfully cleaned up from DB after exceeding attempts limit.');

    // -------------------------------------------------------------
    // SCENARIO 3: Resend OTP limit verification (3 resends)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Resend OTP & Limit (3 Resends) ---');
    // Re-register to start fresh
    await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: TEST_NAME,
        email: TEST_EMAIL,
        mobile: TEST_MOBILE,
        password: TEST_PASSWORD,
      }),
    });

    // Attempt resending OTP 4 times
    for (let r = 1; r <= 4; r++) {
      const resendRes = await fetch(`${API_BASE}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL }),
      });
      const resendData = await resendRes.json();
      console.log(`Resend ${r} response status:`, resendRes.status, '| success:', resendData.success, '| message:', resendData.message);

      if (r <= 3) {
        if (!resendData.success) {
          throw new Error(`Resend ${r} failed unexpectedly: ${resendData.message}`);
        }
      } else {
        // 4th resend should fail
        if (resendData.success || !resendData.message.includes('limit reached')) {
          throw new Error('4th resend did not trigger maximum resend limit');
        }
      }
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Successful OTP Verification and Double-Hashing check
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Successful OTP Verification ---');
    // Re-register again
    await PendingUser.deleteMany({ email: TEST_EMAIL });
    await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: TEST_NAME,
        email: TEST_EMAIL,
        mobile: TEST_MOBILE,
        password: TEST_PASSWORD,
      }),
    });

    pending = await PendingUser.findOne({ email: TEST_EMAIL });
    const correctOtp = pending.otp;
    console.log(`Retrieved correct OTP from DB: ${correctOtp}`);

    const verifySuccessRes = await fetch(`${API_BASE}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: correctOtp }),
    });
    const verifySuccessData = await verifySuccessRes.json();
    console.log('Verify correct OTP response status:', verifySuccessRes.status);
    console.log('Verify correct OTP response body:', verifySuccessData);
    if (!verifySuccessData.success) {
      throw new Error(`Correct OTP verification failed: ${verifySuccessData.message}`);
    }
    if (!verifySuccessData.data.token) {
      throw new Error('JWT token not received upon successful OTP verification.');
    }

    // Double-Hashing login verification
    console.log('Verifying credentials via /login to ensure password was not double-hashed:');
    const loginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: 'Citizen',
      }),
    });
    const loginData = await loginRes.json();
    console.log('Login response status:', loginRes.status, '| success:', loginData.success);
    if (!loginData.success) {
      throw new Error(`Login failed (potential double-hashing bug): ${loginData.message}`);
    }
    console.log('Login successful! Password verification works and is not double-hashed.');

    // -------------------------------------------------------------
    // SCENARIO 5: Google Authentication SSO (Mock Token)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Google Authentication (Sign-Up & Sign-In) ---');
    const mockGoogleToken = 'mock_google_token_integrationtest';

    // Call /google for initial Sign-Up provisioning
    console.log('Triggering Google SSO Sign-Up...');
    const googleSignUpRes = await fetch(`${API_BASE}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockGoogleToken }),
    });
    const googleSignUpData = await googleSignUpRes.json();
    console.log('Google Sign-Up status:', googleSignUpRes.status);
    console.log('Google Sign-Up response data:', googleSignUpData);
    if (!googleSignUpData.success) {
      throw new Error(`Google SSO registration failed: ${googleSignUpData.message}`);
    }
    if (googleSignUpData.data.authMethod !== 'Google' || !googleSignUpData.data.emailVerified) {
      throw new Error('Google SSO user profile has incorrect authMethod or emailVerified state.');
    }

    // Call /google again for Sign-In login check
    console.log('Triggering Google SSO Sign-In...');
    const googleSignInRes = await fetch(`${API_BASE}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockGoogleToken }),
    });
    const googleSignInData = await googleSignInRes.json();
    console.log('Google Sign-In status:', googleSignInRes.status);
    console.log('Google Sign-In response success:', googleSignInData.success);
    if (!googleSignInData.success) {
      throw new Error(`Google SSO login failed: ${googleSignInData.message}`);
    }

    console.log('\n=========================================');
    console.log('🎉 ALL BACKEND AUTHENTICATION INTEGRATION TESTS PASSED!');
    console.log('=========================================');

  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    // Cleanup databases
    console.log('\nPerforming post-test DB cleanup...');
    await User.deleteMany({ email: TEST_EMAIL });
    await PendingUser.deleteMany({ email: TEST_EMAIL });
    await User.deleteMany({ email: 'google.user.integrationtest@gmail.com' });
    await mongoose.disconnect();
    console.log('DB disconnected. Exiting test.');
  }
}

runTests();
