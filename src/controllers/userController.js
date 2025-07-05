const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const User = require('../models/Users');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, role, organization, status, search } = req.query;
  
  const query = {};
  
  if (role) query.role = role;
  if (organization) query.organization = organization;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

const getUserById = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  res.json({
    success: true,
    data: { user }
  });
});

const createUser = catchAsync(async (req, res) => {
  const { name, email, password, role, organization, mobile, status } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { mobile }]
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists with this email or mobile number');
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    organization,
    mobile,
    status
  });

  // Remove password from response
  user.password = undefined;

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'User created successfully',
    data: { user }
  });
});

const updateUser = catchAsync(async (req, res) => {
  const { name, email, role, organization, mobile, status } = req.body;

  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check for duplicate email/mobile if they're being changed
  if (email || mobile) {
    const duplicateQuery = { _id: { $ne: req.params.id } };
    if (email) duplicateQuery.email = email;
    if (mobile) duplicateQuery.mobile = mobile;

    const existingUser = await User.findOne(duplicateQuery);
    if (existingUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email or mobile already in use');
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, role, organization, mobile, status },
    { new: true, runValidators: true }
  ).select('-password');

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: updatedUser }
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  res.json({
    success: true,
    message: 'User status updated successfully',
    data: { user }
  });
});

const getUserStats = catchAsync(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
        admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
        managers: { $sum: { $cond: [{ $eq: ['$role', 'manager'] }, 1, 0] } },
        salesExecutives: { $sum: { $cond: [{ $eq: ['$role', 'sales_executive'] }, 1, 0] } }
      }
    }
  ]);

  const organizationStats = await User.aggregate([
    {
      $group: {
        _id: '$organization',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      overall: stats[0] || {},
      byOrganization: organizationStats
    }
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  getUserStats
};