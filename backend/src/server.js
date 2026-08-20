const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

const server = app.listen(env.port, () => {
  logger.info(`Backend server started successfully`);
  logger.info(`Environment: ${env.nodeEnv}`);
  logger.info(`Port: ${env.port}`);
  logger.info(`Allowed Frontend Origin: ${env.frontendUrl}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err.message });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message });
  process.exit(1);
});
