import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STAFF_ROLES = ['agent', 'admin', 'super_admin', 'root_admin'];

export function ProtectedRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  // Redirect staff away from client pages
  if (user?.role === 'super_admin' || user?.role === 'root_admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'agent' || user?.role === 'admin') return <Navigate to="/agent" replace />;
  return children;
}

export function AgentRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!STAFF_ROLES.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export function SuperAdminRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'super_admin' && user?.role !== 'root_admin') {
    return <Navigate to={STAFF_ROLES.includes(user?.role) ? '/agent' : '/dashboard'} replace />;
  }
  return children;
}

// Legacy aliases
export const AdminRoute = AgentRoute;
export const RootAdminRoute = SuperAdminRoute;
