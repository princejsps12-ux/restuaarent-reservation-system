import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="navbar">
      <span className="brand">🍽️ Reservations</span>
      {user.role === 'admin' ? (
        <>
          <Link to="/admin" style={{ marginLeft: '1rem' }}>Admin Dashboard</Link>
          <Link to="/admin/tables" style={{ marginLeft: '1rem' }}>Manage Tables</Link>
        </>
      ) : (
        <>
          <Link to="/" style={{ marginLeft: '1rem' }}>Book</Link>
          <Link to="/my-reservations" style={{ marginLeft: '1rem' }}>My Reservations</Link>
        </>
      )}
      <span className="spacer" />
      <span className="muted">{user.name}</span>
      <span className={`role-badge ${user.role}`}>{user.role}</span>
      <button className="secondary small" style={{ marginLeft: '0.75rem' }} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
