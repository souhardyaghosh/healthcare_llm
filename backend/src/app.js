const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Middlewares
app.use(cors({
  origin: env.frontendUrl,
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
