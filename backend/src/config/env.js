const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;
