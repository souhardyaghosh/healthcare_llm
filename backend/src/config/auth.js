const env = require('./env');

const authConfig = {
  jwtSecret: env.jwtSecret || 'fallback-dev-secret-if-test',
  jwtExpiresIn: env.jwtExpiresIn || '1d',
  bcryptSaltRounds: 10
};

module.exports = authConfig;
