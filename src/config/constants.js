// Fixed reservation time slots. The only valid values for a reservation.
const TIME_SLOTS = ['18:00', '19:00', '20:00', '21:00'];

const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
};

const RESERVATION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
};

module.exports = { TIME_SLOTS, ROLES, RESERVATION_STATUS };
