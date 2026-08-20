const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validateCreateDoctor, validateUpdateDoctor } = require('../middleware/doctor.validation');
const {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor
} = require('../controllers/doctor.controller');

const router = express.Router();

// Require JWT authentication and ADMIN role for all doctor management endpoints
router.use(authenticate, authorize('ADMIN'));

router.post('/', validateCreateDoctor, createDoctor);
router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.put('/:id', validateUpdateDoctor, updateDoctor);

module.exports = router;
