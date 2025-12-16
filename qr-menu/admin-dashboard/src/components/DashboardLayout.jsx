import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
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
    Star,
    Banknote,
    Menu as MenuIcon,
    X
} from 'lucide-react';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    const menuItems = [
        { icon: LayoutDashboard, label: t('dashboard'), path: '/dashboard' },
        { icon: ShoppingBag, label: t('orders'), path: '/dashboard/orders' },
        { icon: UtensilsCrossed, label: t('menu'), path: '/dashboard/menu' },
        { icon: QrCode, label: t('tables'), path: '/dashboard/tables' },
        { icon: Banknote, label: t('payments'), path: '/dashboard/payments' },
        { icon: Tag, label: t('coupons'), path: '/dashboard/coupons' },
        { icon: Truck, label: t('delivery'), path: '/dashboard/delivery' },
        { icon: Star, label: t('feedback'), path: '/dashboard/feedback' },
        { icon: CreditCard, label: t('subscription'), path: '/dashboard/subscription' },
        { icon: Settings, label: t('settings'), path: '/dashboard/settings' },
    ];

    return (
        <div className="dashboard-layout">
            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                            <h2>🍽️ QR Menu</h2>
                            <p>{t('admin_panel')}</p>
                        </div>
                        <button onClick={closeSidebar} className="icon-btn" style={{ display: 'md:none' }}>
                            {/* Keep X only visible on mobile inside sidebar if needed, or rely on overlay */}
                        </button>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={closeSidebar}
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
                        <span>{t('logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                {/* Header */}
                <header className="header">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={toggleSidebar} className="icon-btn mobile-menu-btn" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                            <MenuIcon size={24} />
                        </button>
                        <h1>{t('welcome')}, {user?.name}</h1>
                    </div>

                    <div className="header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <LanguageSwitcher />
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
