const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const User = require('../models/Users');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpirationMinutes + 'm',
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpirationDays + 'd',
  });
};

const register = catchAsync(async (req, res) => {
  const { name, email, password, role, organization, mobile } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { mobile }]
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists with this email or mobile number');
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    organization,
    mobile
  });

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.password = undefined;

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      tokens: {
        access: token,
        refresh: refreshToken
      }
    }
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  if (user.status === 'inactive') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Account is deactivated');
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.password = undefined;

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      tokens: {
        access: token,
        refresh: refreshToken
      }
    }
  });
});

const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  res.json({
    success: true,
    data: { user }
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const { name, mobile } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, mobile },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Current password is incorrect');
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
  }
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (err) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
  }
  const user = await User.findById(payload.id);
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found');
  }
  const newAccessToken = generateToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      tokens: {
        access: newAccessToken,
        refresh: newRefreshToken
      }
    }
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken
};