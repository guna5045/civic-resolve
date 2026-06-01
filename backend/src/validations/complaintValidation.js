const { body, validationResult } = require('express-validator');

const validateComplaint = [
  body('title').trim().notEmpty().withMessage('Complaint title is required'),
  body('description').trim().notEmpty().withMessage('Complaint description is required'),
  body('category')
    .isIn(['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'])
    .withMessage('Invalid category selected'),
  body('latitude').isFloat().withMessage('Latitude must be a valid coordinate'),
  body('longitude').isFloat().withMessage('Longitude must be a valid coordinate'),
  body('departmentId').isMongoId().withMessage('Invalid department reference'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validateComplaint,
};
