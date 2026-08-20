const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates working hours array payload.
 * Expected payload:
 * {
 *   workingHours: [
 *     { dayOfWeek: 1, startTime: "10:00", endTime: "13:00", slotDurationMinutes: 30, isActive: true }
 *   ]
 * }
 */
const validateWorkingHours = (req, res, next) => {
  const { workingHours } = req.body;

  if (!workingHours || !Array.isArray(workingHours)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload: workingHours array is required.'
      }
    });
  }

  if (workingHours.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'At least one working hour configuration object must be provided.'
      }
    });
  }

  const seenDays = new Set();

  for (let i = 0; i < workingHours.length; i++) {
    const item = workingHours[i];
    const prefix = `Item at index ${i}`;

    // Validate dayOfWeek (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    if (item.dayOfWeek === undefined || item.dayOfWeek === null || typeof item.dayOfWeek !== 'number' || !Number.isInteger(item.dayOfWeek) || item.dayOfWeek < 0 || item.dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${prefix}: dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday).`
        }
      });
    }

    // Duplicate day check within single payload
    if (seenDays.has(item.dayOfWeek)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${prefix}: Duplicate dayOfWeek ${item.dayOfWeek} found in payload. Each day must only be configured once.`
        }
      });
    }
    seenDays.add(item.dayOfWeek);

    // Validate startTime
    if (!item.startTime || typeof item.startTime !== 'string' || !TIME_REGEX.test(item.startTime)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${prefix}: startTime must be a valid 24-hour time string in HH:mm format (e.g. 10:00).`
        }
      });
    }

    // Validate endTime
    if (!item.endTime || typeof item.endTime !== 'string' || !TIME_REGEX.test(item.endTime)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${prefix}: endTime must be a valid 24-hour time string in HH:mm format (e.g. 13:00).`
        }
      });
    }

    // Time sequence validation: startTime < endTime
    const [startH, startM] = item.startTime.split(':').map(Number);
    const [endH, endM] = item.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes >= endMinutes) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${prefix}: startTime (${item.startTime}) must be earlier than endTime (${item.endTime}). Overnight/equal schedules are not supported.`
        }
      });
    }

    // Validate slotDurationMinutes
    const duration = item.slotDurationMinutes;
    if (duration === undefined || duration === null || typeof duration !== 'number' || !Number.isInteger(duration) || duration <= 0 || duration > 240) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${prefix}: slotDurationMinutes must be a positive integer between 5 and 240 minutes (e.g. 15, 30, 60).`
        }
      });
    }

    // Optional isActive validation
    if (item.isActive !== undefined && typeof item.isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${prefix}: isActive must be a boolean value.`
        }
      });
    }
  }

  next();
};

module.exports = {
  validateWorkingHours
};
