const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return errorResponse(res, 'Email already registered', 400);

    // Only allow USER or PROVIDER roles during registration
    const allowedRoles = ['USER', 'PROVIDER'];
    const userRole = allowedRoles.includes(role) ? role : 'USER';

    const user = await User.create({ name, email, password, role: userRole, phone });
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return successResponse(
      res,
      { user, accessToken, refreshToken },
      'Registration successful',
      201
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) return errorResponse(res, 'Account deactivated', 401);
    if (user.isSuspended)
      return errorResponse(res, `Account suspended: ${user.suspendReason || ''}`, 403);

    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    user.refreshToken = refreshToken;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const userObj = user.toJSON();

    return successResponse(res, { user: userObj, accessToken, refreshToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return errorResponse(res, 'Refresh token required', 401);

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return successResponse(res, {}, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  return successResponse(res, { user: req.user }, 'Profile fetched');
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, skills, address } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (bio) updateData.bio = bio;
    if (skills) updateData.skills = skills;
    if (address) updateData.address = address;
    if (req.file) updateData.avatar = req.file.path || `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });
    return successResponse(res, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }
    user.password = newPassword;
    await user.save();
    return successResponse(res, {}, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, logout, getMe, updateProfile, changePassword };
