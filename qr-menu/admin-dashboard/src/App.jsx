import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ConnectivityProvider, useConnectivity } from './contexts/ConnectivityContext';
import ToastContainer from './components/ToastContainer';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateRestaurant from './pages/CreateRestaurant';
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
import Kitchen from './pages/Kitchen';
import WaiterDashboard from './pages/WaiterDashboard';
import StockDashboard from './pages/StockDashboard';
import Delivery from './pages/Delivery';
import Reports from './pages/Reports';
import ManagerDashboard from './pages/ManagerDashboard';
import Clients from './pages/Clients';
import { SocketProvider } from './contexts/SocketContext';
import './App.css';

import UserManagement from './pages/UserManagement';
import Profiles from './pages/Profiles';
import Subscriptions from './pages/Subscriptions';
import ChangePassword from './pages/ChangePassword';
import Settings from './pages/Settings';
import Categories from './pages/Categories';
import Subcategories from './pages/Subcategories';

import DashboardRedirect from './components/DashboardRedirect';

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
      <SubscriptionProvider>
        <ConnectivityProvider>
          <SocketProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </SocketProvider>
        </ConnectivityProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { toasts, removeToast } = useConnectivity();

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-restaurant" element={<CreateRestaurant />} />
        <Route path="/select-restaurant" element={<RestaurantSelection />} />

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
          <Route index element={<DashboardRedirect />} />
          <Route path="analytics" element={<Dashboard />} />
          <Route path="kitchen" element={<Kitchen />} />
          <Route path="waiter" element={<WaiterDashboard />} />
          <Route path="stock" element={<StockDashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="categories" element={<Categories />} />
          <Route path="subcategories" element={<Subcategories />} />
          <Route path="tables" element={<Tables />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="clients" element={<Clients />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="system-admin" element={<SystemAdmin />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/owner-dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OwnerDashboard />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
