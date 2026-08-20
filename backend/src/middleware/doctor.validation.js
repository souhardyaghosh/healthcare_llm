const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateCreateDoctor = (req, res, next) => {
  const { name, email, specialization, bio, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Doctor full name is required'
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

  if (!specialization || typeof specialization !== 'string' || specialization.trim() === '') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Doctor specialization is required'
      }
    });
  }

  if (bio !== undefined && bio !== null && (typeof bio !== 'string' || bio.length > 1000)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bio must be a string up to 1000 characters'
      }
    });
  }

  if (password !== undefined && password !== null && (typeof password !== 'string' || password.length < 6)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 6 characters long if provided'
      }
    });
  }

  next();
};

const validateUpdateDoctor = (req, res, next) => {
  const { name, email, specialization, bio } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Doctor full name cannot be empty'
      }
    });
  }

  if (email !== undefined && (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()))) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A valid email address is required'
      }
    });
  }

  if (specialization !== undefined && (typeof specialization !== 'string' || specialization.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Doctor specialization cannot be empty'
      }
    });
  }

  if (bio !== undefined && bio !== null && (typeof bio !== 'string' || bio.length > 1000)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bio must be a string up to 1000 characters'
      }
    });
  }

  next();
};

module.exports = {
  validateCreateDoctor,
  validateUpdateDoctor
};
