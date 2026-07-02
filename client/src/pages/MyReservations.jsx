import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function MyReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelingId, setCancelingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/reservations/me');
      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    setCancelingId(id);
    setError('');
    try {
      const updated = await api(`/api/reservations/${id}/cancel`, { method: 'PATCH' });
      setReservations((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div>
      <h1>My Reservations</h1>
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : reservations.length === 0 ? (
          <p className="muted">You have no reservations yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Slot</th>
                <th>Table</th>
                <th>Guests</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r._id}>
                  <td>{r.date}</td>
                  <td>{r.timeSlot}</td>
                  <td>{r.table ? `#${r.table.number}` : '—'}</td>
                  <td>{r.guests}</td>
                  <td>
                    <span className={r.status === 'active' ? 'status-active' : 'status-cancelled'}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === 'active' && (
                      <button
                        className="danger small"
                        disabled={cancelingId === r._id}
                        onClick={() => cancel(r._id)}
                      >
                        {cancelingId === r._id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
