const logger = require('../utils/logger');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  logger.error(`Error handling ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack
  });

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = statusCode === 500 && env.nodeEnv === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
};

module.exports = errorHandler;
