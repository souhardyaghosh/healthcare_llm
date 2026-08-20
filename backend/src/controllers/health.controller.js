const logger = require('../utils/logger');

const getHealth = (req, res) => {
  logger.info(`Health check requested from ${req.ip}`);
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'healthcare-appointment-manager-backend',
    module: 'M01',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getHealth
};
