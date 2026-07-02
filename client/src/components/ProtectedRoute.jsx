import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards a route. Redirects to /login if not authenticated,
 * and to the user's home if their role isn't allowed.
 */
export default function ProtectedRoute({ children, role }) {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  }
  return children;
}
