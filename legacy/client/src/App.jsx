import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute, AgentRoute, SuperAdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import RootDashboard    from './pages/root/RootDashboard';
import RootRequestList  from './pages/root/RootRequestList';
import EmployeeList     from './pages/root/EmployeeList';
import RootRoutingRules from './pages/root/RoutingRules';
import RootProfile      from './pages/root/RootProfile';
import ErrorBoundary from './components/ErrorBoundary';

import Home             from './pages/Home';
import Login            from './pages/Login';
import Register         from './pages/Register';
import Dashboard        from './pages/Dashboard';
import RequestDetail    from './pages/RequestDetail';
import RequestList      from './pages/RequestList';
import ProfilePage      from './pages/ProfilePage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import SecurityPage     from './pages/SecurityPage';
import NotificationsPage from './pages/NotificationsPage';
import MyDocumentsPage  from './pages/MyDocumentsPage';

import AgentDashboard      from './pages/agent/AgentDashboard';
import AgentManageRequest  from './pages/agent/AgentManageRequest';

import AdminDashboard      from './pages/admin/AdminDashboard';
import AdminRequestList    from './pages/admin/AdminRequestList';
import AdminManageRequest  from './pages/admin/AdminManageRequest';
import CatalogueManager    from './pages/admin/CatalogueManager';
import RoutingRules        from './pages/admin/RoutingRules';
import TeamManager         from './pages/admin/TeamManager';
import Analytics           from './pages/admin/Analytics';
import { useT } from './context/LanguageContext';

function NotFound() {
  const t = useT();
  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center text-center px-4">
      <div>
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-[#1A3C34] mb-2">{t('not_found_title')}</h1>
        <p className="text-sm text-gray-500">{t('not_found_desc')}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <ToastProvider>
      <BrowserRouter>
        <Navbar />
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Client routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><RequestList /></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/company" element={<ProtectedRoute><CompanyProfilePage /></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><MyDocumentsPage /></ProtectedRoute>} />

          {/* Agent routes */}
          <Route path="/agent" element={<AgentRoute><AgentDashboard /></AgentRoute>} />
          <Route path="/agent/all" element={<AgentRoute><AgentDashboard /></AgentRoute>} />
          <Route path="/agent/requests/:id" element={<AgentRoute><AgentManageRequest /></AgentRoute>} />

          {/* Super Admin routes */}
          <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
          <Route path="/admin/requests" element={<SuperAdminRoute><AdminRequestList /></SuperAdminRoute>} />
          <Route path="/admin/requests/:id" element={<SuperAdminRoute><AdminManageRequest /></SuperAdminRoute>} />
          <Route path="/admin/catalogue" element={<SuperAdminRoute><CatalogueManager /></SuperAdminRoute>} />
          <Route path="/admin/routing" element={<SuperAdminRoute><RoutingRules /></SuperAdminRoute>} />
          <Route path="/admin/team" element={<SuperAdminRoute><TeamManager /></SuperAdminRoute>} />
          <Route path="/admin/analytics" element={<SuperAdminRoute><Analytics /></SuperAdminRoute>} />

          {/* Root (V1) portal routes */}
          <Route path="/root" element={<SuperAdminRoute><RootDashboard /></SuperAdminRoute>} />
          <Route path="/root/requests" element={<SuperAdminRoute><RootRequestList /></SuperAdminRoute>} />
          <Route path="/root/employees" element={<SuperAdminRoute><EmployeeList /></SuperAdminRoute>} />
          <Route path="/root/routing" element={<SuperAdminRoute><RootRoutingRules /></SuperAdminRoute>} />
          <Route path="/root/profile" element={<SuperAdminRoute><RootProfile /></SuperAdminRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
