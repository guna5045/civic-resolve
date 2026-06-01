const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow React Leaflet/images to load properly
}));

// Setup CORS
app.use(cors());

// Development logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads/reports files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/reports', express.static(path.join(__dirname, '../public/reports')));

// Mount API routes
app.use('/api', routes);

// Base route status check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Civic Resolve API Server is running smoothly.' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
