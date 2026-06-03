const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic_resolve');
    console.log('Connected to MongoDB');

    const email = 'civicresolveadmin@email.com';
    const password = 'admin@5045';

    let admin = await User.findOne({ email });
    if (admin) {
      console.log('Admin already exists, updating password...');
      admin.fullName = 'Civic Resolve Administrator';
      admin.passwordHash = password; // pre-save hook will hash it
      admin.status = 'Active';
      admin.role = 'Admin';
      await admin.save();
      console.log('Admin password updated successfully');
    } else {
      console.log('Admin not found, creating new admin...');
      await User.create({
        fullName: 'Civic Resolve Administrator',
        email,
        mobile: '555-0199',
        passwordHash: password, // pre-save hook will hash it
        role: 'Admin',
        status: 'Active',
      });
      console.log('Admin created successfully');
    }

    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  }
};

seedAdmin();
