const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d'
};

if (!config.jwtSecret && config.nodeEnv !== 'test') {
  throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined.');
}

module.exports = config;
