const Department = require('../models/Department');

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 * @access  Public/Private
 */
const getDepartments = async (req, res) => {
  try {
    let departments = await Department.find({});
    if (departments.length === 0) {
      const defaultDepts = [
        { name: 'Roads Department', departmentHead: 'John Doe', description: 'Handles municipal roads and infrastructure.' },
        { name: 'Water Supply Department', departmentHead: 'Jane Smith', description: 'Handles drinking water and sewage systems.' },
        { name: 'Electricity Department', departmentHead: 'Robert Johnson', description: 'Handles streetlights and power distribution.' },
        { name: 'Sanitation Department', departmentHead: 'Emily Davis', description: 'Handles garbage collection and waste management.' },
        { name: 'Public Safety Department', departmentHead: 'Michael Brown', description: 'Handles emergency services and public hazard mitigation.' },
        { name: 'Other Department', departmentHead: 'Sarah Wilson', description: 'Handles miscellaneous municipal complaints.' },
      ];
      departments = await Department.insertMany(defaultDepts);
    }
    res.json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new department
 * @route   POST /api/departments
 * @access  Private (Admin only)
 */
const createDepartment = async (req, res) => {
  const { name, departmentHead, description } = req.body;

  try {
    const departmentExists = await Department.findOne({ name });

    if (departmentExists) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    const department = await Department.create({
      name,
      departmentHead,
      description,
      status: 'Active',
    });

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a department
 * @route   PUT /api/departments/:id
 * @access  Private (Admin only)
 */
const updateDepartment = async (req, res) => {
  const { name, departmentHead, description, status } = req.body;

  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    department.name = name || department.name;
    department.departmentHead = departmentHead !== undefined ? departmentHead : department.departmentHead;
    department.description = description !== undefined ? description : department.description;
    department.status = status || department.status;

    await department.save();
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
};
