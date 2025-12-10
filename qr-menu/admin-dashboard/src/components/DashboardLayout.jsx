import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    ShoppingBag,
    UtensilsCrossed,
    QrCode,
    CreditCard,
    MessageSquare,
    Settings,
    LogOut,
    Bell,
    User,
    Truck,
    Tag,
    Star
} from 'lucide-react';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: ShoppingBag, label: 'Orders', path: '/dashboard/orders' },
        { icon: UtensilsCrossed, label: 'Menu', path: '/dashboard/menu' },
        { icon: QrCode, label: 'Tables', path: '/dashboard/tables' },
        { icon: Tag, label: 'Coupons', path: '/dashboard/coupons' },
        { icon: Truck, label: 'Delivery', path: '/dashboard/delivery' },
        { icon: Star, label: 'Feedback', path: '/dashboard/feedback' },
        { icon: CreditCard, label: 'Subscription', path: '/dashboard/subscription' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
    ];

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>🍽️ QR Menu</h2>
                    <p>Admin Panel</p>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={logout} className="logout-btn">
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <h1>Welcome, {user?.name}</h1>
                    </div>

                    <div className="header-right">
                        <button className="icon-btn">
                            <Bell size={20} />
                        </button>
                        <div className="user-menu">
                            <User size={20} />
                            <span>{user?.email}</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
