import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TIME_SLOTS } from '../config';

export default function AdminDashboard() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Inline edit state: { id, date, timeSlot, guests, status }
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const path = dateFilter
        ? `/api/reservations?date=${encodeURIComponent(dateFilter)}`
        : '/api/reservations';
      const data = await api(path);
      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cancel(id) {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const updated = await api(`/api/reservations/${id}/cancel`, { method: 'PATCH' });
      setReservations((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
      setSuccess('Reservation cancelled.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(r) {
    setSuccess('');
    setError('');
    setEditing({
      id: r._id,
      date: r.date,
      timeSlot: r.timeSlot,
      guests: r.guests,
      status: r.status,
    });
  }

  async function saveEdit() {
    const { id, date, timeSlot, guests, status } = editing;
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const updated = await api(`/api/reservations/${id}`, {
        method: 'PATCH',
        body: { date, timeSlot, guests: Number(guests), status },
      });
      // Keep populated table/user from the previous row; merge changed fields.
      setReservations((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
      setEditing(null);
      setSuccess('Reservation updated.');
    } catch (err) {
      // Surfaces 409 conflict / 400 capacity messages from the backend.
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p className="muted">All reservations across every customer.</p>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="card admin-card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div>
            <label>Filter by date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button onClick={load} disabled={loading}>Apply filter</button>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button
              className="secondary"
              onClick={() => { setDateFilter(''); }}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Set/clear the date then click Apply. (Clear empties the field — click Apply to reload all.)
        </p>
      </div>

      <div className="card admin-card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : reservations.length === 0 ? (
          <p className="muted">No reservations found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Date</th>
                <th>Slot</th>
                <th>Table</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const isEditing = editing && editing.id === r._id;
                return (
                  <tr key={r._id}>
                    <td>
                      {r.user ? (
                        <>
                          {r.user.name}
                          <br />
                          <span className="muted" style={{ fontSize: '0.75rem' }}>{r.user.email}</span>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editing.date}
                          onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                          style={{ marginBottom: 0 }}
                        />
                      ) : r.date}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editing.timeSlot}
                          onChange={(e) => setEditing({ ...editing, timeSlot: e.target.value })}
                          style={{ marginBottom: 0 }}
                        >
                          {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : r.timeSlot}
                    </td>
                    <td>{r.table ? `#${r.table.number} (${r.table.capacity})` : '—'}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editing.guests}
                          onChange={(e) => setEditing({ ...editing, guests: e.target.value })}
                          style={{ marginBottom: 0, maxWidth: 80 }}
                        />
                      ) : r.guests}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editing.status}
                          onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                          style={{ marginBottom: 0 }}
                        >
                          <option value="active">active</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      ) : (
                        <span className={r.status === 'active' ? 'status-active' : 'status-cancelled'}>
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <>
                          <button className="small" disabled={busyId === r._id} onClick={saveEdit}>
                            {busyId === r._id ? 'Saving…' : 'Save'}
                          </button>{' '}
                          <button className="secondary small" onClick={() => setEditing(null)}>
                            Cancel edit
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="secondary small" onClick={() => startEdit(r)}>
                            Edit
                          </button>{' '}
                          {r.status === 'active' && (
                            <button
                              className="danger small"
                              disabled={busyId === r._id}
                              onClick={() => cancel(r._id)}
                            >
                              {busyId === r._id ? '…' : 'Cancel'}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
