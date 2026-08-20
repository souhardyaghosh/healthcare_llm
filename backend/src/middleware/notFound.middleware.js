const logger = require('../utils/logger');

const notFoundHandler = (req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
};

module.exports = notFoundHandler;
