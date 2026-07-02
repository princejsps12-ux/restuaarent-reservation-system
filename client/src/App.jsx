import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import BookReservation from './pages/BookReservation';
import MyReservations from './pages/MyReservations';
import AdminDashboard from './pages/AdminDashboard';
import ManageTables from './pages/ManageTables';

// Sends a logged-in user to the right home based on role.
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/book'} replace />;
}

export default function App() {
  const { ready } = useAuth();
  if (!ready) return null;

  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer */}
          <Route
            path="/book"
            element={
              <ProtectedRoute role="customer">
                <BookReservation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-reservations"
            element={
              <ProtectedRoute role="customer">
                <MyReservations />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tables"
            element={
              <ProtectedRoute role="admin">
                <ManageTables />
              </ProtectedRoute>
            }
          />

          {/* Role-aware landing + catch-all */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </div>
    </>
  );
}
