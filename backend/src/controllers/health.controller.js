const logger = require('../utils/logger');
const prisma = require('../config/prisma');

const getHealth = async (req, res) => {
  logger.info(`Health check requested from ${req.ip}`);

  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (err) {
    logger.error(`Database health check failed: ${err.message}`);
    dbConnected = false;
  }

  res.status(200).json({
    success: true,
    status: dbConnected ? 'ok' : 'degraded',
    service: 'healthcare-appointment-manager-backend',
    module: 'M02',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected
    }
  });
};

module.exports = {
  getHealth
};
