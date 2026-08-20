const logger = require('../utils/logger');

/**
 * Reusable Role-Based Access Control (RBAC) Middleware
 * @param {...string} allowedRoles Roles allowed to access the route (PATIENT, DOCTOR, ADMIN)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Ensure user authentication context exists
    if (!req.user) {
      logger.warn('RBAC check failed: Request lacks authenticated user context');
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required prior to authorization check'
        }
      });
    }

    // 2. Verify user's role against allowedRoles
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`RBAC authorization forbidden: User ${req.user.id} with role '${req.user.role}' attempted to access route requiring [${allowedRoles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access forbidden: Insufficient role permissions for this resource'
        }
      });
    }

    next();
  };
};

module.exports = {
  authorize
};
