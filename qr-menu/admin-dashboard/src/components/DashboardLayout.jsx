import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
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
    X,
    Users as UsersIcon,
    Shield,
    ShieldCheck,
    FileText,
    Package
} from 'lucide-react';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isBackendConnected, setIsBackendConnected] = useState(true);

    // Check backend connection
    useState(() => {
        const checkConnection = async () => {
            try {
                await api.healthCheck();
                setIsBackendConnected(true);
            } catch (error) {
                console.error('Backend connection failed:', error);
                setIsBackendConnected(false);
            }
        };

        // Check immediately
        checkConnection();

        // Check every 10 seconds
        const interval = setInterval(checkConnection, 10000);
        return () => clearInterval(interval);
    }, []);

    const isActive = (path) => location.pathname === path;

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    const menuItems = [
        { icon: LayoutDashboard, label: t('dashboard'), path: '/dashboard' },
        { icon: UtensilsCrossed, label: t('kitchen_monitor') || 'Kitchen Display', path: '/dashboard/kitchen' },
        { icon: User, label: t('waiter_mode') || 'Waiter Mode', path: '/dashboard/waiter' },
        { icon: FileText, label: t('reports'), path: '/dashboard/reports' },
        { icon: ShoppingBag, label: t('orders'), path: '/dashboard/orders' },
        { icon: UtensilsCrossed, label: t('menu'), path: '/dashboard/menu' },
        { icon: QrCode, label: t('tables'), path: '/dashboard/tables' },
        { icon: Banknote, label: t('payments'), path: '/dashboard/payments' },
        { icon: Tag, label: t('coupons'), path: '/dashboard/coupons' },
        { icon: Truck, label: t('delivery'), path: '/dashboard/delivery' },
        { icon: Star, label: t('feedback'), path: '/dashboard/feedback' },
        { icon: CreditCard, label: t('subscription'), path: '/dashboard/subscription' },
        { icon: Package, label: t('stock_costs') || 'Stock & Costs', path: '/dashboard/stock' },
        { icon: Settings, label: t('settings'), path: '/dashboard/settings' },
    ];

    // Check permissions (assuming populated role object or legacy string check for safety)
    const hasPermission = (perm) => {
        if (!user?.role) return false;
        // Handle if role is just a string (legacy/error)
        if (typeof user.role === 'string') return ['owner', 'admin'].includes(user.role);

        // Handle Role object
        return user.role.isSystem && (user.role.permissions?.includes('all') || user.role.permissions?.includes(perm));
    };

    if (hasPermission('manage_staff')) {
        menuItems.push(
            { icon: UsersIcon, label: t('users'), path: '/dashboard/users' },
            { icon: Shield, label: t('profiles'), path: '/dashboard/profiles' }
        );
    }

    // Demo: Add System Admin link for Owner
    if (user?.role?.name === 'Owner' || user?.role?.isSystem) {
        menuItems.push({ icon: ShieldCheck, label: 'System Admin', path: '/system-admin' });
        menuItems.unshift({ icon: LayoutDashboard, label: 'Owner Overview', path: '/owner-dashboard' });
    }

    return (
        <div className="dashboard-layout">
            {!isBackendConnected && (
                <div style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: '500',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    ⚠️ Não consigo me conectar com a api/backend
                </div>
            )}

            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                style={{ top: !isBackendConnected ? '48px' : '0' }}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarOpen ? 'open' : ''}`}
                style={{ top: !isBackendConnected ? '48px' : '0', height: !isBackendConnected ? 'calc(100vh - 48px)' : '100vh' }}
            >
                <div className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {user?.restaurant?.logo ? (
                                <img
                                    src={user.restaurant.logo}
                                    alt="Restaurant Logo"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        border: '1px solid #e5e7eb'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}>🍽️</div>
                            )}
                            <div>
                                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{user?.restaurant?.name || 'QR Menu'}</h2>
                                <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.7 }}>{t('admin_panel')}</p>
                            </div>
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
            <div
                className="main-content"
                style={{ marginTop: !isBackendConnected ? '48px' : '0', height: !isBackendConnected ? 'calc(100vh - 48px)' : '100vh' }}
            >
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
