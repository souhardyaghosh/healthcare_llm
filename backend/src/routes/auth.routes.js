const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);

// Minimal RBAC verification test routes
router.get('/test/admin', authenticate, authorize('ADMIN'), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome Admin', role: req.user.role });
});

router.get('/test/doctor-or-admin', authenticate, authorize('DOCTOR', 'ADMIN'), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome Doctor or Admin', role: req.user.role });
});

router.get('/test/patient-or-admin', authenticate, authorize('PATIENT', 'ADMIN'), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome Patient or Admin', role: req.user.role });
});

module.exports = router;
