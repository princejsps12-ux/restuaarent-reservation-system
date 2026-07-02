const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getAvailableTables,
  listTables,
  createTable,
  updateTable,
  deleteTable,
} = require('../controllers/tableController');

const router = express.Router();

// Availability requires a logged-in user.
router.get('/available', auth, getAvailableTables);

// Table management is admin-only.
router.get('/', auth, requireRole(ROLES.ADMIN), listTables);
router.post('/', auth, requireRole(ROLES.ADMIN), createTable);
router.patch('/:id', auth, requireRole(ROLES.ADMIN), updateTable);
router.delete('/:id', auth, requireRole(ROLES.ADMIN), deleteTable);

module.exports = router;
