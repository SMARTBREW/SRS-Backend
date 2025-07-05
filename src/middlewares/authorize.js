const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const authorize = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
    }

    if (requiredRoles.length && !requiredRoles.includes(req.user.role)) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
    }

    next();
  };
};

module.exports = authorize; 