require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startEscalationJob } = require('./src/jobs/cronJobs');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Start Background Escalation SLA job
startEscalationJob();

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Promise Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
