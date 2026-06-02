import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ConnectivityProvider, useConnectivity } from './contexts/ConnectivityContext';
import ToastContainer from './components/ToastContainer';
import { LoadingProvider } from './contexts/LoadingContext';
import GlobalLoader from './components/GlobalLoader';
import DashboardLayout from './components/DashboardLayout';
import { SocketProvider } from './contexts/SocketContext';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import './App.css';
 
import PremiumFeatureGate from './components/PremiumFeatureGate';

import DashboardRedirect from './DashboardRedirect';

// Lazy Loaded Routes - Melhora massivamente o tempo de carregamento inicial (TTI)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CreateRestaurant = lazy(() => import('./pages/CreateRestaurant'));
const RestaurantSelection = lazy(() => import('./pages/RestaurantSelection'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const Menu = lazy(() => import('./pages/Menu'));
const Tables = lazy(() => import('./pages/Tables'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Subscription = lazy(() => import('./pages/Subscription'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const Payments = lazy(() => import('./pages/Payments'));
const SystemAdmin = lazy(() => import('./pages/SystemAdmin'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const WaiterDashboard = lazy(() => import('./pages/WaiterDashboard'));
const StockDashboard = lazy(() => import('./pages/StockDashboard'));
const Delivery = lazy(() => import('./pages/Delivery'));
const Reports = lazy(() => import('./pages/Reports'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const AccountingDashboard = lazy(() => import('./pages/AccountingDashboard'));
const FiscalInvoices = lazy(() => import('./pages/FiscalInvoices'));
const CashManagement = lazy(() => import('./pages/CashManagement'));
const PlanOfAccounts = lazy(() => import('./pages/PlanOfAccounts'));
const Clients = lazy(() => import('./pages/Clients'));
const HallDashboard = lazy(() => import('./pages/HallDashboard'));
const GeneralLedger = lazy(() => import('./pages/GeneralLedger'));
const Razao = lazy(() => import('./pages/reports/Razao'));
const DRE = lazy(() => import('./pages/reports/DRE'));
const ApuramentoIVA = lazy(() => import('./pages/reports/ApuramentoIVA'));
const BatchPosting = lazy(() => import('./pages/accounting/BatchPosting'));
const BalancoPatrimonial = lazy(() => import('./pages/reports/BalancoPatrimonial'));
const Balancete = lazy(() => import('./pages/reports/Balancete'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Profiles = lazy(() => import('./pages/Profiles'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const AdminHub = lazy(() => import('./pages/AdminHub'));
const Categories = lazy(() => import('./pages/Categories'));
const Subcategories = lazy(() => import('./pages/Subcategories'));
const AssistedOrder = lazy(() => import('./pages/waiter/AssistedOrder'));
const WaiterAnalytics = lazy(() => import('./pages/WaiterAnalytics'));
const KitchenAnalytics = lazy(() => import('./pages/KitchenAnalytics'));
const WeeklyMenuManagement = lazy(() => import('./pages/WeeklyMenuManagement'));
const RoomServiceManagement = lazy(() => import('./pages/RoomServiceManagement'));
const RoomOrders = lazy(() => import('./pages/RoomOrders'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // Sem loading visual
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.isDefaultPassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

function AccountingGuard({ children }) {
  const { systemCurrency } = useCurrency();
  const allowedCurrencies = ['MT', 'MZN'];

  // If currency is somehow not loaded yet, ignore, but if it is and it's not MT/MZN, block it
  if (systemCurrency && !allowedCurrencies.includes(systemCurrency.toUpperCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <SubscriptionProvider>
          <ConnectivityProvider>
            <SocketProvider>
              <LoadingProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppContent />
                </BrowserRouter>
              </LoadingProvider>
            </SocketProvider>
          </ConnectivityProvider>
        </SubscriptionProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { toasts, removeToast } = useConnectivity();

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Suspense fallback={<GlobalLoader mode="fullscreen" size="lg" message="A carregar sistema..." />}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-restaurant" element={<CreateRestaurant />} />
        <Route path="/select-restaurant" element={<RestaurantSelection />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

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
          <Route path="stock-management" element={
            <PremiumFeatureGate featureName="Controlo de Stock" blurOnly={true}>
              <StockDashboard />
            </PremiumFeatureGate>
          } />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="categories" element={<Categories />} />
          <Route path="subcategories" element={<Subcategories />} />
          <Route path="tables" element={<Tables />} />
          <Route path="coupons" element={
            <PremiumFeatureGate featureName="Cupons de Desconto" blurOnly={true}>
              <Coupons />
            </PremiumFeatureGate>
          } />
          <Route path="delivery" element={<Delivery />} />
          <Route path="feedback" element={
            <PremiumFeatureGate featureName="Feedback de Clientes" blurOnly={true}>
              <Feedback />
            </PremiumFeatureGate>
          } />
          <Route path="subscription" element={<Subscription />} />
          <Route path="plans" element={<SubscriptionPlans />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={
            <PremiumFeatureGate featureName="Relatórios Detalhados" blurOnly={true}>
              <Reports />
            </PremiumFeatureGate>
          } />
          <Route path="accounting" element={
            <AccountingGuard>
              <PremiumFeatureGate featureName="Módulo Contabilístico & Fiscal" blurOnly={true}>
                <AccountingDashboard />
              </PremiumFeatureGate>
            </AccountingGuard>
          } />
          <Route path="accounting/invoices" element={<AccountingGuard><FiscalInvoices /></AccountingGuard>} />
          <Route path="accounting/cash" element={<AccountingGuard><CashManagement /></AccountingGuard>} />
          <Route path="accounting/accounts" element={<AccountingGuard><PlanOfAccounts /></AccountingGuard>} />
          <Route path="accounting/ledger" element={<AccountingGuard><GeneralLedger /></AccountingGuard>} />
          <Route path="accounting/batch" element={<AccountingGuard><BatchPosting /></AccountingGuard>} />
          <Route path="accounting/razao" element={<AccountingGuard><Razao /></AccountingGuard>} />
          <Route path="accounting/dre" element={<AccountingGuard><DRE /></AccountingGuard>} />
          <Route path="accounting/iva" element={<AccountingGuard><ApuramentoIVA /></AccountingGuard>} />
          <Route path="accounting/balance-sheet" element={<AccountingGuard><BalancoPatrimonial /></AccountingGuard>} />
          <Route path="accounting/balancete" element={<AccountingGuard><Balancete /></AccountingGuard>} />
          <Route path="clients" element={<Clients />} />
          <Route path="hall" element={<HallDashboard />} />
          <Route path="waiter-analytics" element={<WaiterAnalytics />} />
          <Route path="kitchen-analytics" element={<KitchenAnalytics />} />
          <Route path="weekly-menus" element={<WeeklyMenuManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="system-admin" element={<SystemAdmin />} />
          <Route path="settings" element={<AdminHub />} />
          <Route path="room-service" element={
            <PremiumFeatureGate featureName="Serviço de Quartos" blurOnly={true}>
              <RoomServiceManagement />
            </PremiumFeatureGate>
          } />
          <Route path="room-orders" element={
            <PremiumFeatureGate featureName="Serviço de Quartos" blurOnly={true}>
              <RoomOrders />
            </PremiumFeatureGate>
          } />
          <Route path="about-us" element={<AboutUs />} />
        </Route>

        <Route path="/owner-dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            <PremiumFeatureGate featureName="Dashboard Executivo" blurOnly={true}>
              <OwnerDashboard />
            </PremiumFeatureGate>
          } />
        </Route>

        <Route path="/dashboard/waiter/order/:tableId" element={
          <ProtectedRoute>
            <AssistedOrder />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
