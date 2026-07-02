const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { TIME_SLOTS, RESERVATION_STATUS } = require('../config/constants');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/tables/available?date=&timeSlot=&guests=
// Tables with enough capacity that have no ACTIVE reservation in that slot.
const getAvailableTables = asyncHandler(async (req, res) => {
  const { date, timeSlot } = req.query;
  const guests = Number(req.query.guests);

  if (!date || !timeSlot || !req.query.guests) {
    throw new ApiError(400, 'date, timeSlot and guests query params are required');
  }
  if (!DATE_RE.test(date)) {
    throw new ApiError(400, 'date must be in YYYY-MM-DD format');
  }
  if (!TIME_SLOTS.includes(timeSlot)) {
    throw new ApiError(400, `timeSlot must be one of: ${TIME_SLOTS.join(', ')}`);
  }
  if (!Number.isInteger(guests) || guests <= 0) {
    throw new ApiError(400, 'guests must be a positive integer');
  }

  // Tables already taken by an active reservation for this slot.
  const takenIds = await Reservation.find({
    date,
    timeSlot,
    status: RESERVATION_STATUS.ACTIVE,
  }).distinct('table');

  const tables = await Table.find({
    _id: { $nin: takenIds },
    capacity: { $gte: guests },
  }).sort({ capacity: 1, number: 1 });

  res.json(tables);
});

// GET /api/tables  (admin) — list every table
const listTables = asyncHandler(async (req, res) => {
  const tables = await Table.find().sort({ number: 1 });
  res.json(tables);
});

// POST /api/tables  (admin) — create a table
const createTable = asyncHandler(async (req, res) => {
  const { number, capacity } = req.body;

  if (!Number.isInteger(number) || number <= 0) {
    throw new ApiError(400, 'number must be a positive integer');
  }
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new ApiError(400, 'capacity must be a positive integer');
  }

  try {
    const table = await Table.create({ number, capacity });
    res.status(201).json(table);
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, `Table number ${number} already exists`);
    }
    throw err;
  }
});

// PATCH /api/tables/:id  (admin) — update a table
const updateTable = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  const { number, capacity } = req.body;
  if (number !== undefined) {
    if (!Number.isInteger(number) || number <= 0) {
      throw new ApiError(400, 'number must be a positive integer');
    }
    table.number = number;
  }
  if (capacity !== undefined) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new ApiError(400, 'capacity must be a positive integer');
    }
    table.capacity = capacity;
  }

  try {
    await table.save();
    res.json(table);
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, `Table number ${table.number} already exists`);
    }
    throw err;
  }
});

// DELETE /api/tables/:id  (admin) — delete a table
const deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  // Don't orphan active bookings — force the admin to cancel them first.
  const activeCount = await Reservation.countDocuments({
    table: table._id,
    status: RESERVATION_STATUS.ACTIVE,
  });
  if (activeCount > 0) {
    throw new ApiError(409, 'Cannot delete a table that has active reservations');
  }

  await table.deleteOne();
  res.json({ message: 'Table deleted' });
});

module.exports = {
  getAvailableTables,
  listTables,
  createTable,
  updateTable,
  deleteTable,
};
