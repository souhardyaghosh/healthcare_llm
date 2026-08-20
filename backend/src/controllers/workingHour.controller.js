const prisma = require('../config/prisma');
const logger = require('../utils/logger');

/**
 * Helper to resolve doctorProfile record by either DoctorProfile.id or User.id
 */
const resolveDoctorProfile = async (idParam) => {
  let profile = await prisma.doctorProfile.findUnique({
    where: { id: idParam }
  });

  if (!profile) {
    profile = await prisma.doctorProfile.findUnique({
      where: { userId: idParam }
    });
  }

  return profile;
};

/**
 * GET /api/doctors/:doctorId/working-hours
 * Retrieves doctor working hours sorted deterministically by dayOfWeek ASC (0-6).
 */
const getDoctorWorkingHours = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const doctorProfile = await resolveDoctorProfile(doctorId);

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCTOR_NOT_FOUND',
          message: `No doctor found with ID ${doctorId}.`
        }
      });
    }

    const workingHours = await prisma.workingHour.findMany({
      where: { doctorId: doctorProfile.id },
      orderBy: { dayOfWeek: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: {
        doctorId: doctorProfile.id,
        workingHours
      }
    });
  } catch (error) {
    logger.error('Error fetching doctor working hours:', error);
    next(error);
  }
};

/**
 * PUT /api/doctors/:doctorId/working-hours
 * Atomically saves/updates doctor working hours.
 * Enforces ownership check: DOCTOR can only edit own schedule, ADMIN can edit any schedule, PATIENT forbidden.
 */
const updateDoctorWorkingHours = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { workingHours: inputHours } = req.body;
    const currentUser = req.user;

    const doctorProfile = await resolveDoctorProfile(doctorId);

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCTOR_NOT_FOUND',
          message: `No doctor found with ID ${doctorId}.`
        }
      });
    }

    // Role & Ownership Authorization Check
    if (currentUser.role === 'PATIENT') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Patients are not authorized to configure working hours.'
        }
      });
    }

    if (currentUser.role === 'DOCTOR' && doctorProfile.userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Doctors are only authorized to configure their own working hours.'
        }
      });
    }

    // Perform atomic update inside a Prisma transaction
    const updatedHours = await prisma.$transaction(async (tx) => {
      // Delete previous working hours for this doctor
      await tx.workingHour.deleteMany({
        where: { doctorId: doctorProfile.id }
      });

      // Insert new working hours
      await tx.workingHour.createMany({
        data: inputHours.map((wh) => ({
          doctorId: doctorProfile.id,
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
          slotDurationMinutes: wh.slotDurationMinutes || 30,
          isActive: wh.isActive !== undefined ? wh.isActive : true
        }))
      });

      // Return refreshed working hours sorted by dayOfWeek ASC
      return tx.workingHour.findMany({
        where: { doctorId: doctorProfile.id },
        orderBy: { dayOfWeek: 'asc' }
      });
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: 'UPDATE_WORKING_HOURS',
        entityType: 'DoctorProfile',
        entityId: doctorProfile.id,
        details: JSON.stringify({ updatedDaysCount: updatedHours.length })
      }
    }).catch(e => logger.warn('Audit log creation failed:', e.message));

    logger.info(`Updated working hours for doctor ${doctorProfile.id} by user ${currentUser.id}`);

    return res.status(200).json({
      success: true,
      data: {
        doctorId: doctorProfile.id,
        workingHours: updatedHours
      }
    });
  } catch (error) {
    logger.error('Error updating doctor working hours:', error);
    next(error);
  }
};

module.exports = {
  getDoctorWorkingHours,
  updateDoctorWorkingHours
};
