const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 * @access  Public/Private
 */
const getDepartments = async (req, res) => {
  try {
    let departments = await Department.find({});
    const defaultDepts = [
      { name: 'Roads Department', departmentHead: 'John Doe', description: 'Handles municipal roads, potholes, and markings.' },
      { name: 'Electricity Department', departmentHead: 'Robert Johnson', description: 'Handles power issues and electrical hazards.' },
      { name: 'Water Supply Department', departmentHead: 'Jane Smith', description: 'Handles drinking water supply and leakages.' },
      { name: 'Sanitation Department', departmentHead: 'Emily Davis', description: 'Handles waste management and garbage collection.' },
      { name: 'Drainage & Sewerage Department', departmentHead: 'Michael Brown', description: 'Handles blocked sewers and drainage clearance.' },
      { name: 'Street Lighting Department', departmentHead: 'Sarah Wilson', description: 'Handles street light maintenance and failures.' },
      { name: 'Traffic & Signals Department', departmentHead: 'David Lee', description: 'Handles traffic lights, signs, and signal timing.' },
      { name: 'Public Health Department', departmentHead: 'Lisa Anderson', description: 'Handles vector control, sanitization, and health hazards.' },
      { name: 'Parks & Greenery Department', departmentHead: 'James Taylor', description: 'Handles municipal parks, gardens, and tree trimming.' },
      { name: 'Building & Encroachment Department', departmentHead: 'Patricia White', description: 'Handles building code violations and illegal encroachments.' },
    ];

    let seeded = false;
    for (const d of defaultDepts) {
      const exists = departments.some(dept => dept.name.toLowerCase() === d.name.toLowerCase());
      if (!exists) {
        await Department.create(d);
        seeded = true;
      }
    }

    if (seeded) {
      departments = await Department.find({});
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
  const { name, departmentHead, description, category, color, icon } = req.body;

  try {
    const departmentExists = await Department.findOne({ name });

    if (departmentExists) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    const department = await Department.create({
      name,
      departmentHead,
      description,
      category: category || 'Other',
      color: color || '#3b82f6',
      icon: icon || 'Layers',
      status: 'Active',
    });

    // Write Audit Log
    await AuditLog.create({
      user: req.user._id,
      action: 'Department Created',
      module: 'Departments',
      description: `Created department: ${name}`,
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
  const { name, departmentHead, description, status, category, color, icon } = req.body;

  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const isStatusToggle = status && status !== department.status;
    const oldStatus = department.status;

    department.name = name || department.name;
    department.departmentHead = departmentHead !== undefined ? departmentHead : department.departmentHead;
    department.description = description !== undefined ? description : department.description;
    department.status = status || department.status;
    department.category = category || department.category;
    department.color = color || department.color;
    department.icon = icon || department.icon;

    await department.save();

    // Write Audit Log
    if (isStatusToggle) {
      const action = status === 'Active' ? 'Department Reactivated' : 'Department Deactivated';
      await AuditLog.create({
        user: req.user._id,
        action: action,
        module: 'Departments',
        description: `${action}: ${department.name}`,
      });
    } else {
      await AuditLog.create({
        user: req.user._id,
        action: 'Department Modified',
        module: 'Departments',
        description: `Modified details for department: ${department.name}`,
      });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get department statistics
 * @route   GET /api/departments/:id/stats
 * @access  Private (Admin only)
 */
const getDepartmentStats = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const User = require('../models/User');
    const Complaint = require('../models/Complaint');

    const officerCount = await User.countDocuments({ role: 'Department Officer', department: id, status: 'Active' });
    const totalOfficers = await User.countDocuments({ role: 'Department Officer', department: id });
    const totalComplaints = await Complaint.countDocuments({ department: id });
    const pendingComplaints = await Complaint.countDocuments({
      department: id,
      status: { $in: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Escalated'] }
    });
    const resolvedComplaints = await Complaint.countDocuments({
      department: id,
      status: { $in: ['Resolved', 'Closed'] }
    });
    const rejectedComplaints = await Complaint.countDocuments({
      department: id,
      status: 'Rejected'
    });

    res.json({
      success: true,
      data: {
        department,
        stats: {
          officerCount,
          totalOfficers,
          totalComplaints,
          pendingComplaints,
          resolvedComplaints,
          rejectedComplaints
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  getDepartmentStats,
};
