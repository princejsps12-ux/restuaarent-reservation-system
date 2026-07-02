const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  createReservation,
  getMyReservations,
  cancelReservation,
  listReservations,
  updateReservation,
} = require('../controllers/reservationController');

const router = express.Router();

// Everything under /api/reservations requires authentication.
router.use(auth);

// Customer routes
router.post('/', createReservation);
router.get('/me', getMyReservations);
router.patch('/:id/cancel', cancelReservation); // owner or admin

// Admin routes
router.get('/', requireRole(ROLES.ADMIN), listReservations);
router.patch('/:id', requireRole(ROLES.ADMIN), updateReservation);

module.exports = router;
