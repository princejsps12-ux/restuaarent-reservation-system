const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { TIME_SLOTS, ROLES, RESERVATION_STATUS } = require('../config/constants');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Returns true if `date` (YYYY-MM-DD) is strictly before today (server local date).
function isPastDate(date) {
  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return date < todayStr;
}

// POST /api/reservations  (customer)
const createReservation = asyncHandler(async (req, res) => {
  const { table: tableId, date, timeSlot, guests } = req.body;

  if (!tableId || !date || !timeSlot || guests === undefined) {
    throw new ApiError(400, 'table, date, timeSlot and guests are required');
  }
  if (!DATE_RE.test(date)) {
    throw new ApiError(400, 'date must be in YYYY-MM-DD format');
  }

  // Validation order matters — see each status code.
  // 1. date not in the past
  if (isPastDate(date)) {
    throw new ApiError(400, 'date cannot be in the past');
  }
  // 2. guests > 0
  if (!Number.isInteger(guests) || guests <= 0) {
    throw new ApiError(400, 'guests must be a positive integer');
  }
  // 3. valid time slot
  if (!TIME_SLOTS.includes(timeSlot)) {
    throw new ApiError(400, `timeSlot must be one of: ${TIME_SLOTS.join(', ')}`);
  }
  // 4. table exists and has enough capacity
  const table = await Table.findById(tableId);
  if (!table) {
    throw new ApiError(404, 'Table not found');
  }
  if (table.capacity < guests) {
    throw new ApiError(400, 'Table capacity is less than the number of guests');
  }
  // 5. no existing ACTIVE reservation for the same {table, date, timeSlot}
  const clash = await Reservation.findOne({
    table: tableId,
    date,
    timeSlot,
    status: RESERVATION_STATUS.ACTIVE,
  });
  if (clash) {
    throw new ApiError(409, 'That table is already booked for this date and time slot');
  }

  try {
    const reservation = await Reservation.create({
      user: req.user._id,
      table: tableId,
      date,
      timeSlot,
      guests,
    });
    res.status(201).json(reservation);
  } catch (err) {
    // Race-condition guard: the unique partial index can still reject a concurrent insert.
    if (err.code === 11000) {
      throw new ApiError(409, 'That table is already booked for this date and time slot');
    }
    throw err;
  }
});

// GET /api/reservations/me  (customer)
const getMyReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id })
    .populate('table')
    .sort({ date: 1, timeSlot: 1 });
  res.json(reservations);
});

// PATCH /api/reservations/:id/cancel  (customer cancels own; admin cancels any)
const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    throw new ApiError(404, 'Reservation not found');
  }

  const isOwner = reservation.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'You can only cancel your own reservations');
  }

  reservation.status = RESERVATION_STATUS.CANCELLED;
  await reservation.save();
  res.json(reservation);
});

// GET /api/reservations?date=  (admin) — all reservations, optional date filter
const listReservations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.date) {
    if (!DATE_RE.test(req.query.date)) {
      throw new ApiError(400, 'date must be in YYYY-MM-DD format');
    }
    filter.date = req.query.date;
  }

  const reservations = await Reservation.find(filter)
    .populate('table')
    .populate('user')
    .sort({ date: 1, timeSlot: 1 });
  res.json(reservations);
});

// PATCH /api/reservations/:id  (admin) — update any reservation
const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    throw new ApiError(404, 'Reservation not found');
  }

  const { table: tableId, date, timeSlot, guests, status } = req.body;

  // Build the intended next state so we can validate it as a whole.
  const next = {
    table: tableId !== undefined ? tableId : reservation.table,
    date: date !== undefined ? date : reservation.date,
    timeSlot: timeSlot !== undefined ? timeSlot : reservation.timeSlot,
    guests: guests !== undefined ? guests : reservation.guests,
    status: status !== undefined ? status : reservation.status,
  };

  if (!DATE_RE.test(next.date)) {
    throw new ApiError(400, 'date must be in YYYY-MM-DD format');
  }
  if (!Number.isInteger(next.guests) || next.guests <= 0) {
    throw new ApiError(400, 'guests must be a positive integer');
  }
  if (!TIME_SLOTS.includes(next.timeSlot)) {
    throw new ApiError(400, `timeSlot must be one of: ${TIME_SLOTS.join(', ')}`);
  }
  if (![RESERVATION_STATUS.ACTIVE, RESERVATION_STATUS.CANCELLED].includes(next.status)) {
    throw new ApiError(400, 'status must be active or cancelled');
  }

  const table = await Table.findById(next.table);
  if (!table) {
    throw new ApiError(404, 'Table not found');
  }
  if (table.capacity < next.guests) {
    throw new ApiError(400, 'Table capacity is less than the number of guests');
  }

  // If this will be active, ensure it doesn't clash with a different active reservation.
  if (next.status === RESERVATION_STATUS.ACTIVE) {
    const clash = await Reservation.findOne({
      _id: { $ne: reservation._id },
      table: next.table,
      date: next.date,
      timeSlot: next.timeSlot,
      status: RESERVATION_STATUS.ACTIVE,
    });
    if (clash) {
      throw new ApiError(409, 'That table is already booked for this date and time slot');
    }
  }

  Object.assign(reservation, next);

  try {
    await reservation.save();
    res.json(reservation);
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'That table is already booked for this date and time slot');
    }
    throw err;
  }
});

module.exports = {
  createReservation,
  getMyReservations,
  cancelReservation,
  listReservations,
  updateReservation,
};
