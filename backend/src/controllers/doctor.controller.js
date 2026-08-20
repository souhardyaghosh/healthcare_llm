const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const authConfig = require('../config/auth');
const logger = require('../utils/logger');

const SAFE_DOCTOR_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  doctorProfile: {
    select: {
      id: true,
      specialization: true,
      bio: true,
      createdAt: true,
      updatedAt: true
    }
  }
};

/**
 * Create a new doctor (Admin only)
 * Performs transactional creation of User (role: DOCTOR) and linked DoctorProfile
 */
const createDoctor = async (req, res, next) => {
  try {
    const { name, email, specialization, bio, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      logger.warn(`Doctor creation failed: Duplicate email attempt for ${normalizedEmail}`);
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email address already exists'
        }
      });
    }

    // Default or provided password
    const rawPassword = password || 'DoctorSecret123!';
    const passwordHash = await bcrypt.hash(rawPassword, authConfig.bcryptSaltRounds);

    // Prisma Transaction to ensure atomic User + DoctorProfile creation
    const doctor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'DOCTOR' // Hardcoded role enforcement for doctor management
        }
      });

      const doctorProfile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialization: specialization.trim(),
          bio: bio ? bio.trim() : null
        }
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        doctorProfile: {
          id: doctorProfile.id,
          specialization: doctorProfile.specialization,
          bio: doctorProfile.bio,
          createdAt: doctorProfile.createdAt,
          updatedAt: doctorProfile.updatedAt
        }
      };
    });

    logger.info(`Successfully created new doctor: ${doctor.id} (${doctor.email})`);

    return res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      data: doctor
    });
  } catch (err) {
    logger.error(`Create doctor error: ${err.message}`);
    next(err);
  }
};

/**
 * Get all doctors (Admin only)
 * Deterministically sorted by createdAt descending
 */
const getDoctors = async (req, res, next) => {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR'
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: SAFE_DOCTOR_SELECT
    });

    return res.status(200).json({
      success: true,
      data: {
        doctors,
        count: doctors.length
      }
    });
  } catch (err) {
    logger.error(`Get doctors error: ${err.message}`);
    next(err);
  }
};

/**
 * Get single doctor by User ID (Admin only)
 */
const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doctor = await prisma.user.findFirst({
      where: {
        id,
        role: 'DOCTOR'
      },
      select: SAFE_DOCTOR_SELECT
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCTOR_NOT_FOUND',
          message: 'Doctor account not found'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        doctor
      }
    });
  } catch (err) {
    logger.error(`Get doctor by ID error: ${err.message}`);
    next(err);
  }
};

/**
 * Update doctor (Admin only)
 * Updates User (name, email) and DoctorProfile (specialization, bio)
 */
const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, specialization, bio } = req.body;

    // Check existing doctor
    const existingDoctor = await prisma.user.findFirst({
      where: {
        id,
        role: 'DOCTOR'
      },
      include: {
        doctorProfile: true
      }
    });

    if (!existingDoctor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCTOR_NOT_FOUND',
          message: 'Doctor account not found'
        }
      });
    }

    // If email is changing, check duplicate
    let normalizedEmail;
    if (email) {
      normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== existingDoctor.email) {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            email: normalizedEmail,
            id: { not: id }
          }
        });

        if (duplicateUser) {
          logger.warn(`Doctor update failed: Duplicate email attempt for ${normalizedEmail}`);
          return res.status(409).json({
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'An account with this email address already exists'
            }
          });
        }
      }
    }

    // Atomic transaction for updating User and DoctorProfile
    const updatedDoctor = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          email: normalizedEmail || undefined
          // Role is strictly maintained as DOCTOR
        }
      });

      let updatedProfile;
      if (existingDoctor.doctorProfile) {
        updatedProfile = await tx.doctorProfile.update({
          where: { userId: id },
          data: {
            specialization: specialization !== undefined ? specialization.trim() : undefined,
            bio: bio !== undefined ? (bio ? bio.trim() : null) : undefined
          }
        });
      } else {
        updatedProfile = await tx.doctorProfile.create({
          data: {
            userId: id,
            specialization: specialization ? specialization.trim() : 'General Practitioner',
            bio: bio ? bio.trim() : null
          }
        });
      }

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        doctorProfile: {
          id: updatedProfile.id,
          specialization: updatedProfile.specialization,
          bio: updatedProfile.bio,
          createdAt: updatedProfile.createdAt,
          updatedAt: updatedProfile.updatedAt
        }
      };
    });

    logger.info(`Successfully updated doctor: ${updatedDoctor.id} (${updatedDoctor.email})`);

    return res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: updatedDoctor
    });
  } catch (err) {
    logger.error(`Update doctor error: ${err.message}`);
    next(err);
  }
};

module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor
};
