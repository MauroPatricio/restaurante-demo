import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ManagerDashboard from '../pages/ManagerDashboard';
import WaiterDashboard from '../pages/WaiterDashboard';

export default function DashboardRedirect() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    if (loading) return <div>Loading...</div>;

    // Normalize role and permissions
    const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
    const permissions = user?.role?.permissions || [];
    const hasAllPermissions = permissions.includes('all');

    // Check for "take_orders" permission (Waiter)
    const hasTakeOrders = roleName === 'Waiter' ||
        permissions.includes('take_orders') ||
        hasAllPermissions;

    if (hasTakeOrders) {
        return <WaiterDashboard />;
    }

    // Check for "update_order_status" permission (Kitchen)
    const hasKitchenAccess = roleName === 'Kitchen' ||
        permissions.includes('update_order_status') ||
        hasAllPermissions;

    // Check for "view_delivery_orders" permission (Delivery)
    const hasDeliveryAccess = roleName === 'Delivery' ||
        permissions.includes('view_delivery_orders') ||
        permissions.includes('update_delivery_status') ||
        hasAllPermissions;

    // Check for Management access
    const isManager = roleName === 'Manager' ||
        roleName === 'Owner' ||
        permissions.includes('view_reports') ||
        permissions.includes('manage_settings');

    // Redirect to Kitchen if they have access but aren't managers
    if (hasKitchenAccess && !isManager) {
        return <Navigate to="/dashboard/kitchen" replace />;
    }

    // Redirect to Delivery if they have access but aren't managers
    if (hasDeliveryAccess && !isManager) {
        return <Navigate to="/dashboard/delivery" replace />;
    }

    // Default Fallback
    return <ManagerDashboard />;
}
