import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function ManageTables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);

  // New-table form
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline edit: { id, number, capacity }
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/tables');
      setTables(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTable(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      const table = await api('/api/tables', {
        method: 'POST',
        body: { number: Number(number), capacity: Number(capacity) },
      });
      setTables((prev) => [...prev, table].sort((a, b) => a.number - b.number));
      setNumber('');
      setCapacity('');
      setSuccess(`Table ${table.number} added.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit() {
    const { id, number: n, capacity: c } = editing;
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const updated = await api(`/api/tables/${id}`, {
        method: 'PATCH',
        body: { number: Number(n), capacity: Number(c) },
      });
      setTables((prev) =>
        prev.map((t) => (t._id === id ? updated : t)).sort((a, b) => a.number - b.number)
      );
      setEditing(null);
      setSuccess('Table updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeTable(id, num) {
    if (!window.confirm(`Delete table ${num}? This cannot be undone.`)) return;
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      await api(`/api/tables/${id}`, { method: 'DELETE' });
      setTables((prev) => prev.filter((t) => t._id !== id));
      setSuccess(`Table ${num} deleted.`);
    } catch (err) {
      // e.g. 409 "Cannot delete a table that has active reservations"
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1>Manage Tables</h1>
      <p className="muted">Add, edit, or remove restaurant tables.</p>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="card admin-card">
        <h2>Add a table</h2>
        <form onSubmit={createTable}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div>
              <label>Table number</label>
              <input
                type="number"
                min="1"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Capacity (seats)</label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button type="submit" disabled={creating}>
                {creating ? 'Adding…' : 'Add table'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card admin-card">
        <h2>All tables</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : tables.length === 0 ? (
          <p className="muted">No tables yet. Add one above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => {
                const isEditing = editing && editing.id === t._id;
                return (
                  <tr key={t._id}>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editing.number}
                          onChange={(e) => setEditing({ ...editing, number: e.target.value })}
                          style={{ marginBottom: 0, maxWidth: 90 }}
                        />
                      ) : (
                        `#${t.number}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editing.capacity}
                          onChange={(e) => setEditing({ ...editing, capacity: e.target.value })}
                          style={{ marginBottom: 0, maxWidth: 90 }}
                        />
                      ) : (
                        `${t.capacity} seats`
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <>
                          <button className="small" disabled={busyId === t._id} onClick={saveEdit}>
                            {busyId === t._id ? 'Saving…' : 'Save'}
                          </button>{' '}
                          <button className="secondary small" onClick={() => setEditing(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="secondary small"
                            onClick={() =>
                              setEditing({ id: t._id, number: t.number, capacity: t.capacity })
                            }
                          >
                            Edit
                          </button>{' '}
                          <button
                            className="danger small"
                            disabled={busyId === t._id}
                            onClick={() => removeTable(t._id, t.number)}
                          >
                            {busyId === t._id ? '…' : 'Delete'}
                          </button>
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
