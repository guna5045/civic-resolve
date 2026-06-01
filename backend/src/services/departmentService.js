const Department = require('../models/Department');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

const create = async (name, departmentHead, description) => {
  const departmentExists = await Department.findOne({ name });
  if (departmentExists) {
    throw new Error('Department already exists');
  }

  return await Department.create({
    name,
    departmentHead: departmentHead || '',
    description: description || '',
    status: 'Active',
  });
};

const update = async (id, data) => {
  const department = await Department.findById(id);
  if (!department) throw new Error('Department not found');

  if (data.name) department.name = data.name;
  if (data.departmentHead !== undefined) department.departmentHead = data.departmentHead;
  if (data.description !== undefined) department.description = data.description;
  if (data.status) department.status = data.status;

  return await department.save();
};

const remove = async (id) => {
  const department = await Department.findById(id);
  if (!department) throw new Error('Department not found');

  // Disable / Mark Inactive instead of hard delete to keep historical records
  department.status = 'Inactive';
  return await department.save();
};

const assignOfficer = async (deptId, officerId) => {
  const officer = await User.findById(officerId);
  if (!officer || officer.role !== 'Department Officer') {
    throw new Error('Invalid officer specified');
  }

  officer.department = deptId;
  return await officer.save();
};

const calculateMetrics = async (deptId) => {
  const total = await Complaint.countDocuments({ department: deptId });
  const resolved = await Complaint.countDocuments({ department: deptId, status: { $in: ['Resolved', 'Closed'] } });
  const inProgress = await Complaint.countDocuments({ department: deptId, status: 'In Progress' });

  const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return {
    total,
    resolved,
    inProgress,
    completionRate,
  };
};

module.exports = {
  create,
  update,
  delete: remove,
  assignOfficer,
  calculateMetrics,
};
