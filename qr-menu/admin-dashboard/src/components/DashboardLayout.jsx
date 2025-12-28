import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
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
    Package,
    Folder,
    FolderTree,
    AlertCircle,
    CreditCard as CreditCardIcon
} from 'lucide-react';
import { useConnectivity } from '../contexts/ConnectivityContext';
import SubscriptionBlocker from './SubscriptionBlocker';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const { subscription, isBlocked } = useSubscription();
    const { isBackendConnected } = useConnectivity();
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Redirect to subscription page if blocked and not already there
    useEffect(() => {
        if (isBlocked && !location.pathname.includes('/subscription')) {
            navigate('/dashboard/subscription', { replace: true });
        }
    }, [isBlocked, location.pathname, navigate]);

    // Helper: Get restaurant data - handles both object and ID-only cases
    const getRestaurantData = () => {
        // If user.restaurant is an object with properties, use it directly
        if (user?.restaurant && typeof user.restaurant === 'object' && user.restaurant.name) {
            return user.restaurant;
        }

        // If user.restaurant is just an ID (string), get data from user.restaurants array
        if (user?.restaurants && user.restaurants.length > 0) {
            // Try to find the matching restaurant by ID
            if (typeof user.restaurant === 'string') {
                const match = user.restaurants.find(r => r.id === user.restaurant || r._id === user.restaurant);
                if (match) return {
                    _id: match.id || match._id,
                    id: match.id || match._id,
                    name: match.name,
                    logo: match.logo,
                    active: match.active !== undefined ? match.active : true // Default to true if not specified
                };
            }
            // Fallback to first restaurant
            return {
                _id: user.restaurants[0].id || user.restaurants[0]._id,
                id: user.restaurants[0].id || user.restaurants[0]._id,
                name: user.restaurants[0].name,
                logo: user.restaurants[0].logo,
                active: true // We don't have this in the restaurants array, default to true
            };
        }

        return null;
    };

    const restaurantData = getRestaurantData();

    const isActive = (path) => location.pathname === path;

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    // Build menu items array
    const menuItems = [];

    // Check if user is Owner or Manager
    const isOwnerOrManager = user?.role?.name === 'Owner' || user?.role?.name === 'Manager' || user?.role?.isSystem;

    // Check permissions
    const hasPermission = (perm) => {
        if (!user?.role) return false;
        if (typeof user.role === 'string') return ['owner', 'admin'].includes(user.role);
        return user.role.isSystem && (user.role.permissions?.includes('all') || user.role.permissions?.includes(perm));
    };

    // Add Owner Overview for Owners
    if (user?.role?.name === 'Owner' || user?.role?.isSystem) {
        menuItems.push({ icon: LayoutDashboard, label: t('owner_overview'), path: '/owner-dashboard' });
    }

    // Core menu items (available for everyone)
    menuItems.push(
        { icon: LayoutDashboard, label: t('dashboard'), path: '/dashboard' },
        { icon: UtensilsCrossed, label: t('kitchen_monitor'), path: '/dashboard/kitchen' },
        { icon: User, label: t('waiter_mode'), path: '/dashboard/waiter' },
        { icon: FileText, label: t('reports'), path: '/dashboard/reports' },
        { icon: ShoppingBag, label: t('orders'), path: '/dashboard/orders' },
        { icon: UtensilsCrossed, label: t('menu'), path: '/dashboard/menu' },
        { icon: Folder, label: t('categories'), path: '/dashboard/categories' },
        { icon: FolderTree, label: t('subcategories'), path: '/dashboard/subcategories' },
        { icon: QrCode, label: t('tables'), path: '/dashboard/tables' },
        { icon: Banknote, label: t('payments'), path: '/dashboard/payments' },
        { icon: Tag, label: t('coupons'), path: '/dashboard/coupons' },
        { icon: Truck, label: t('delivery'), path: '/dashboard/delivery' },
        { icon: Star, label: t('feedback'), path: '/dashboard/feedback' },
        { icon: CreditCard, label: t('subscription'), path: '/dashboard/subscription' },
        { icon: Package, label: t('stock_costs'), path: '/dashboard/stock' }
    );

    // Add Users menu item for Owners and Managers
    if (isOwnerOrManager) {
        menuItems.push({ icon: UsersIcon, label: t('users'), path: '/dashboard/users' });
    }

    // Add Settings for everyone
    menuItems.push({ icon: Settings, label: t('settings'), path: '/dashboard/settings' });

    // Add Profiles for those with manage_staff permission
    if (hasPermission('manage_staff')) {
        menuItems.push({ icon: Shield, label: t('profiles'), path: '/dashboard/profiles' });
    }

    // Add Subscriptions Management for Admin (system-wide role)
    if (user?.role?.name === 'Admin' && user?.role?.isSystem) {
        menuItems.push({ icon: CreditCardIcon, label: 'Subscriptions', path: '/dashboard/subscriptions' });
    }

    // Add System Admin link for Owner or Admin
    if (user?.role?.name === 'Owner' || user?.role?.isSystem) {
        menuItems.push({ icon: ShieldCheck, label: t('system_admin'), path: '/system-admin' });
    }

    // Calculate days until expiry for banner
    const getDaysUntilExpiry = () => {
        if (!subscription?.currentPeriodEnd) return null;
        const now = new Date();
        const end = new Date(subscription.currentPeriodEnd);
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilExpiry = getDaysUntilExpiry();
    const showWarningBanner = subscription && (daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0);
    const showExpiredBanner = isBlocked || (daysUntilExpiry !== null && daysUntilExpiry <= 0);

    // Calculate dynamic top offset for content based on banners
    let bannerOffset = 0;
    if (!isBackendConnected) {
        bannerOffset += 48; // Connectivity banner height
    }
    if (showExpiredBanner && isOwnerOrManager) {
        bannerOffset += 60; // Expired banner height
    } else if (showWarningBanner && isOwnerOrManager) {
        bannerOffset += 48; // Warning banner height
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

            {/* Subscription Warning Banner */}
            {showExpiredBanner && isOwnerOrManager && (
                <div style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '14px 20px',
                    textAlign: 'center',
                    fontWeight: '500',
                    position: 'fixed',
                    top: !isBackendConnected ? '48px' : 0,
                    left: 0,
                    right: 0,
                    zIndex: 9998,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                }}>
                    <AlertCircle size={20} />
                    <span>⚠️ {t('subscription_expired_message')}</span>
                    <Link to="/dashboard/subscription" style={{
                        background: 'white',
                        color: '#dc2626',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <CreditCardIcon size={16} />
                        {t('subscription_renew_now')}
                    </Link>
                </div>
            )}

            {showWarningBanner && !showExpiredBanner && isOwnerOrManager && (
                <div style={{
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontWeight: '500',
                    position: 'fixed',
                    top: !isBackendConnected ? '48px' : 0,
                    left: 0,
                    right: 0,
                    zIndex: 9998,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                }}>
                    <AlertCircle size={18} />
                    <span>{t('subscription_expiring_message', { days: daysUntilExpiry })}</span>
                    <Link to="/dashboard/subscription" style={{
                        background: 'white',
                        color: '#f59e0b',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '13px'
                    }}>
                        {t('subscription_view_details')}
                    </Link>
                </div>
            )}

            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                style={{ top: `${bannerOffset}px` }}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarOpen ? 'open' : ''}`}
                style={{ top: !isBackendConnected ? '48px' : '0', height: !isBackendConnected ? 'calc(100vh - 48px)' : '100vh' }}
            >
                <div className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            {/* Restaurant Logo */}
                            <div style={{ position: 'relative' }}>
                                {restaurantData?.logo ? (
                                    <img
                                        src={restaurantData.logo}
                                        alt="Restaurant Logo"
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '10px',
                                            objectFit: 'cover',
                                            border: '2px solid rgba(100, 108, 255, 0.2)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}>🍽️</div>
                                )}
                                {/* Restaurant Active/Inactive Status Indicator */}
                                <div
                                    onClick={async () => {
                                        if (isOwnerOrManager) {
                                            try {
                                                const restaurantId = restaurantData?._id || restaurantData?.id;
                                                const response = await fetch(`http://localhost:5000/api/restaurants/${restaurantId}/toggle-active`, {
                                                    method: 'PATCH',
                                                    headers: {
                                                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                    }
                                                });
                                                if (response.ok) {
                                                    // Refresh page to update status
                                                    window.location.reload();
                                                }
                                            } catch (error) {
                                                console.error('Failed to toggle restaurant status:', error);
                                            }
                                        }
                                    }}
                                    title={isOwnerOrManager ? (restaurantData?.active ? 'Clique para desativar' : 'Clique para ativar') : (restaurantData?.active ? 'Restaurante Ativo' : 'Restaurante Inativo')}
                                    style={{
                                        position: 'absolute',
                                        bottom: '-2px',
                                        right: '-2px',
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: restaurantData?.active ? '#10b981' : '#ef4444',
                                        border: '2px solid var(--card-bg)',
                                        boxShadow: `0 0 0 2px ${restaurantData?.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                        animation: restaurantData?.active ? 'pulse-green 2s infinite' : 'pulse-red 2s infinite',
                                        cursor: isOwnerOrManager ? 'pointer' : 'default',
                                        transition: 'transform 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => isOwnerOrManager && (e.target.style.transform = 'scale(1.2)')}
                                    onMouseLeave={(e) => isOwnerOrManager && (e.target.style.transform = 'scale(1)')}
                                ></div>
                            </div>

                            {/* Restaurant Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 style={{
                                    fontSize: '1.1rem',
                                    margin: 0,
                                    fontWeight: '600',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {restaurantData?.name || 'QR Menu'}
                                </h2>
                                <p style={{
                                    fontSize: '0.75rem',
                                    margin: 0,
                                    opacity: 0.7,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {t('admin_panel')}
                                    <span
                                        onClick={async () => {
                                            if (isOwnerOrManager) {
                                                try {
                                                    const restaurantId = restaurantData?._id || restaurantData?.id;
                                                    const response = await fetch(`http://localhost:5000/api/restaurants/${restaurantId}/toggle-active`, {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                        }
                                                    });
                                                    if (response.ok) {
                                                        window.location.reload();
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to toggle restaurant status:', error);
                                                }
                                            }
                                        }}
                                        title={isOwnerOrManager ? 'Clique para alterar status' : ''}
                                        style={{
                                            fontSize: '0.7rem',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: restaurantData?.active
                                                ? 'rgba(16, 185, 129, 0.15)'
                                                : 'rgba(239, 68, 68, 0.15)',
                                            color: restaurantData?.active ? '#10b981' : '#ef4444',
                                            fontWeight: '600',
                                            marginLeft: '4px',
                                            cursor: isOwnerOrManager ? 'pointer' : 'default',
                                            transition: 'all 0.2s ease',
                                            userSelect: 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (isOwnerOrManager) {
                                                e.target.style.opacity = '0.8';
                                                e.target.style.transform = 'scale(1.05)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (isOwnerOrManager) {
                                                e.target.style.opacity = '1';
                                                e.target.style.transform = 'scale(1)';
                                            }
                                        }}
                                    >
                                        {restaurantData?.active ? t('active') || 'Ativo' : t('inactive') || 'Inativo'}
                                    </span>
                                </p>
                            </div>
                        </div>
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
                    {isBlocked && !location.pathname.includes('/subscription') ? (
                        <SubscriptionBlocker
                            status={subscription?.status || 'expired'}
                            subscription={subscription}
                        />
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>
        </div>
    );
}
