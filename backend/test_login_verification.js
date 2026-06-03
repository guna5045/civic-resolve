const mongoose = require('mongoose');
const User = require('./src/models/User');
const Department = require('./src/models/Department');
require('dotenv').config();

const API_URL = 'http://127.0.0.1:5000/api';

const runVerification = async () => {
  console.log('============================================================');
  console.log('CIVIC RESOLVE - LOGIN WORKFLOW & SECURITY VALIDATION');
  console.log('============================================================\n');

  try {
    // 0. Connect to MongoDB to fetch a valid department and clear test user
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic_resolve');
    console.log('✓ Connected to MongoDB.');

    const department = await Department.findOne({ status: 'Active' });
    if (!department) {
      console.error('Error: No active department found in database to run verification.');
      mongoose.disconnect();
      return;
    }
    console.log(`✓ Selected Department for test: "${department.name}" (${department._id})`);

    // Clean up any existing test officer
    const testEmail = 'audit.officer@civicresolve.gov';
    await User.deleteMany({ email: testEmail });
    console.log(`✓ Cleaned up any old test officer accounts using email: "${testEmail}"`);

    // Disconnect so we don't hold connection locks
    mongoose.disconnect();

    // 1. ADMIN LOGIN VERIFICATION
    console.log('\n--- STEP 1: Verify New Permanent Admin Login ---');
    const adminEmail = 'civicresolveadmin@email.com';
    const adminPassword = 'admin@5045';

    console.log(`Attempting login for Admin: "${adminEmail}"...`);
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmail,
        password: adminPassword,
        role: 'Admin',
      }),
    });

    const adminLoginData = await adminLoginRes.json();

    if (adminLoginRes.status === 200 && adminLoginData.success) {
      console.log('✓ Admin Login Successful!');
      console.log(`✓ JWT Token Issued: ${adminLoginData.data.token.substring(0, 30)}...`);
    } else {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
    }

    const adminToken = adminLoginData.data.token;

    // 2. OFFICER CREATION VERIFICATION (via Admin REST endpoint)
    console.log('\n--- STEP 2: Create a New Officer via Admin console ---');
    console.log(`Registering officer "${testEmail}" under department "${department.name}"...`);

    const createOfficerRes = await fetch(`${API_URL}/admin/officers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Audit Test Officer',
        email: testEmail,
        mobile: '555-9000',
        password: 'officerpassword123',
        departmentId: department._id.toString(),
      }),
    });

    const createOfficerData = await createOfficerRes.json();

    if (createOfficerRes.status === 201 && createOfficerData.success) {
      console.log('✓ Officer Creation Successful!');
      console.log(`✓ User ID: ${createOfficerData.data._id}`);
      console.log(`✓ Assigned Department: ${createOfficerData.data.department}`);
    } else {
      throw new Error(`Officer creation failed: ${JSON.stringify(createOfficerData)}`);
    }

    // 3. OFFICER LOGIN VERIFICATION (using correct credentials and correct department selector)
    console.log('\n--- STEP 3: Verify Officer Login with Correct Credentials ---');
    console.log('Attempting login with email, password, and correct department selector...');

    const officerLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: 'officerpassword123',
        role: 'Department Officer',
        departmentId: department._id.toString(),
      }),
    });

    const officerLoginData = await officerLoginRes.json();

    if (officerLoginRes.status === 200 && officerLoginData.success) {
      console.log('✓ Officer Login Successful!');
      console.log(`✓ JWT Token Issued: ${officerLoginData.data.token.substring(0, 30)}...`);
    } else {
      throw new Error(`Officer login failed: ${JSON.stringify(officerLoginData)}`);
    }

    // 4. DEPARTMENT VALIDATION VERIFICATION
    console.log('\n--- STEP 4: Verify Department Validation is working ---');
    const dummyDeptId = new mongoose.Types.ObjectId().toString();
    console.log(`Attempting login with incorrect department ID: "${dummyDeptId}"...`);

    const badDeptRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: 'officerpassword123',
        role: 'Department Officer',
        departmentId: dummyDeptId,
      }),
    });

    const badDeptData = await badDeptRes.json();

    if (badDeptRes.status === 403) {
      console.log('✓ Department Validation Working! Login rejected with status 403.');
      console.log(`✓ Server message: "${badDeptData.message}"`);
    } else {
      throw new Error(`Fail: Login succeeded or returned unexpected status: ${badDeptRes.status}, data: ${JSON.stringify(badDeptData)}`);
    }

    console.log('\n============================================================');
    console.log('VERIFICATION SUMMARY');
    console.log('============================================================');
    console.log('✓ New Admin Created:          SUCCESS');
    console.log('✓ Admin Login Successful:      SUCCESS');
    console.log('✓ New Officer Created:        SUCCESS');
    console.log('✓ New Officer Login:          SUCCESS');
    console.log('✓ Department Validation:      SUCCESS');
    console.log('============================================================');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
  }
};

runVerification();
