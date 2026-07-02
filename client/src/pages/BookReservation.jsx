import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TIME_SLOTS } from '../config';

// Today's date as YYYY-MM-DD for the date input's min attribute.
function todayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function BookReservation() {
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [guests, setGuests] = useState(2);

  const [tables, setTables] = useState(null); // null = not searched yet
  const [searching, setSearching] = useState(false);
  const [bookingId, setBookingId] = useState(null); // table _id being booked
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function findTables(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTables(null);
    setSearching(true);
    try {
      const params = new URLSearchParams({ date, timeSlot, guests: String(guests) });
      const result = await api(`/api/tables/available?${params.toString()}`);
      setTables(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function book(tableId) {
    setError('');
    setSuccess('');
    setBookingId(tableId);
    try {
      await api('/api/reservations', {
        method: 'POST',
        body: { table: tableId, date, timeSlot, guests: Number(guests) },
      });
      setSuccess('Reservation confirmed!');
      // Refresh availability so the just-booked table disappears.
      setTables((prev) => (prev ? prev.filter((t) => t._id !== tableId) : prev));
    } catch (err) {
      // Surfaces backend messages like "That table is already booked…" (409)
      // or capacity errors (400).
      setError(err.message);
    } finally {
      setBookingId(null);
    }
  }

  return (
    <div>
      <h1>Book a reservation</h1>

      <div className="card">
        <h2>1. Choose your slot</h2>
        <form onSubmit={findTables}>
          <div className="row">
            <div>
              <label>Date</label>
              <input
                type="date"
                min={todayStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Time slot</label>
              <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Guests</label>
              <input
                type="number"
                min="1"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={searching}>
            {searching ? 'Searching…' : 'Find available tables'}
          </button>
        </form>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && (
        <div className="alert success">
          {success}{' '}
          <a onClick={() => navigate('/my-reservations')} style={{ cursor: 'pointer' }}>
            View my reservations →
          </a>
        </div>
      )}

      {tables !== null && (
        <div className="card">
          <h2>2. Available tables</h2>
          {tables.length === 0 ? (
            <p className="muted">
              No tables available for {date} at {timeSlot} for {guests} guest(s).
              Try another slot.
            </p>
          ) : (
            tables.map((t) => (
              <div key={t._id} className="table-option">
                <span>
                  <strong>Table {t.number}</strong>{' '}
                  <span className="muted">· seats {t.capacity}</span>
                </span>
                <button
                  className="small"
                  disabled={bookingId === t._id}
                  onClick={() => book(t._id)}
                >
                  {bookingId === t._id ? 'Booking…' : 'Book this table'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
