const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validateWorkingHours } = require('../middleware/workingHour.validation');
const {
  getDoctorWorkingHours,
  updateDoctorWorkingHours
} = require('../controllers/workingHour.controller');

const router = express.Router({ mergeParams: true });

// Require JWT authentication for all working hours endpoints
router.use(authenticate);

router.get('/', getDoctorWorkingHours);
router.put('/', validateWorkingHours, updateDoctorWorkingHours);

module.exports = router;
