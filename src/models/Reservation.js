const mongoose = require('mongoose');
const { TIME_SLOTS, RESERVATION_STATUS } = require('../config/constants');

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
    },
    // Stored as a YYYY-MM-DD string so a slot maps to a single calendar day.
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    timeSlot: {
      type: String,
      required: true,
      enum: TIME_SLOTS,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: [RESERVATION_STATUS.ACTIVE, RESERVATION_STATUS.CANCELLED],
      default: RESERVATION_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

// Race-condition guard: at most one ACTIVE reservation per {table, date, timeSlot}.
// The partial filter lets cancelled reservations coexist freely.
reservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: RESERVATION_STATUS.ACTIVE } }
);

module.exports = mongoose.model('Reservation', reservationSchema);
