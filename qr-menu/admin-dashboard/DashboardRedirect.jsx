import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardRedirect() {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    // Normalize role and permissions
    const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
    const permissions = user?.role?.permissions || [];
    const hasAllPermissions = permissions.includes('all');

    // Check for Management access
    const isManager = roleName === 'Manager' ||
        roleName === 'Owner' ||
        roleName === 'Admin' ||
        user?.role?.isSystem === true ||
        hasAllPermissions;

    // Define specific operational roles based on permissions or names
    const isWaiter = roleName === 'Waiter' || permissions.includes('take_orders');
    const isKitchen = roleName === 'Kitchen' || permissions.includes('update_order_status');
    const isDelivery = roleName === 'Delivery' || permissions.includes('view_delivery_orders');
    const isCashier = roleName === 'Cashier' || roleName === 'Caixa';
    const isStock = roleName === 'Stock' || roleName === 'Estoquista';

    // --- REDIRECTION LOGIC ---
    // The order is important. Check specific operational roles first.
    // The '!isManager' check prevents a user who is both (e.g. an Owner testing the waiter view) from being misdirected.

    if (isWaiter && !isManager) {
        return <Navigate to="/dashboard/waiter" replace />;
    }

    // Redirect to Kitchen if they have access but aren't managers
    if (isKitchen && !isManager) {
        return <Navigate to="/dashboard/kitchen" replace />;
    }

    // Redirect to Delivery if they have access but aren't managers
    if (isDelivery && !isManager) {
        return <Navigate to="/dashboard/delivery" replace />;
    }

    // Direct Redirects for other Operational Roles
    if (isCashier && !isManager) {
        return <Navigate to="/dashboard/orders" replace />;
    }

    if (isStock && !isManager) {
        return <Navigate to="/dashboard/stock-management" replace />;
    }

    // If none of the specific operational roles match (or if the user IS a manager),
    // fall back to the main manager dashboard.
    // The default dashboard for a manager/admin is the analytics page.
    return <Navigate to="/dashboard/analytics" replace />;
}
