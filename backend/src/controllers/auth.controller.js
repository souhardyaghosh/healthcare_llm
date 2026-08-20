const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const authConfig = require('../config/auth');
const logger = require('../utils/logger');

// Email regex pattern for basic validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Full name is required'
        }
      });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid email address is required'
        }
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password is required and must be at least 6 characters long'
        }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      logger.warn(`Registration failed: Duplicate email attempt for ${normalizedEmail}`);
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email address already exists'
        }
      });
    }

    // 3. Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, authConfig.bcryptSaltRounds);

    // 4. Force PATIENT role for public registration (ignore client-supplied role)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'PATIENT' // Security enforcement: public registration always creates PATIENT
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    logger.info(`Successfully registered new patient user: ${newUser.id} (${newUser.email})`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: newUser
    });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    next(err);
  }
};

module.exports = {
  register
};
