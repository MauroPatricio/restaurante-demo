import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import RestaurantSelection from './pages/RestaurantSelection';
import OwnerDashboard from './pages/OwnerDashboard';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Tables from './pages/Tables';
import Coupons from './pages/Coupons';
import Feedback from './pages/Feedback';
import Subscription from './pages/Subscription';
import Payments from './pages/Payments';
import SystemAdmin from './pages/SystemAdmin';
import Reports from './pages/Reports';
import './App.css';

import Users from './pages/Users';
import Profiles from './pages/Profiles';
import ChangePassword from './pages/ChangePassword';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.isDefaultPassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/select-restaurant" element={<RestaurantSelection />} />
          <Route path="/owner-dashboard" element={
            <ProtectedRoute>
              <OwnerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="menu" element={<Menu />} />
            <Route path="tables" element={<Tables />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="system-admin" element={<SystemAdmin />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
