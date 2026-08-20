const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const authConfig = require('../config/auth');
const logger = require('../utils/logger');

/**
 * Reusable JWT Authentication Middleware
 * 1. Extract Bearer token from Authorization header
 * 2. Verify JWT signature and expiration
 * 3. Fetch authenticated user from PostgreSQL via Prisma
 * 4. Attach safe user object to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is required'
        }
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization header format. Expected Bearer token'
        }
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is missing'
        }
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, authConfig.jwtSecret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired'
          }
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or malformed authentication token'
        }
      });
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      logger.warn(`Authentication failed: User id ${decoded.sub} in token no longer exists`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account no longer exists'
        }
      });
    }

    // Attach user context to request
    req.user = user;
    next();
  } catch (err) {
    logger.error(`Authentication middleware error: ${err.message}`);
    next(err);
  }
};

module.exports = {
  authenticate
};
