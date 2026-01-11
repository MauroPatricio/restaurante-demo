import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LanguageSwitcher from './LanguageSwitcher';
import {
    LayoutDashboard,
    LayoutGrid,
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
    CreditCard as CreditCardIcon,
    Volume2,
    VolumeX
} from 'lucide-react';
import { useConnectivity } from '../contexts/ConnectivityContext';
import SubscriptionBlocker from './SubscriptionBlocker';
import SubscriptionAlert from './SubscriptionAlert';
import { useSocket } from '../contexts/SocketContext';
import WaiterCallAlerts from './WaiterCallAlerts';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const { subscription, isBlocked } = useSubscription();
    const { isBackendConnected } = useConnectivity();
    const { pendingCount, isRinging, stopRinging, toggleAudio, audioEnabled } = useSocket();
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
        if (user?.restaurant && typeof user.restaurant === 'object' && user.restaurant.name) {
            return user.restaurant;
        }

        if (user?.restaurants && user.restaurants.length > 0) {
            if (typeof user.restaurant === 'string') {
                const match = user.restaurants.find(r => r.id === user.restaurant || r._id === user.restaurant);
                if (match) return {
                    _id: match.id || match._id,
                    id: match.id || match._id,
                    name: match.name,
                    logo: match.logo,
                    active: match.active !== undefined ? match.active : true
                };
            }
            return {
                _id: user.restaurants[0].id || user.restaurants[0]._id,
                id: user.restaurants[0].id || user.restaurants[0]._id,
                name: user.restaurants[0].name,
                logo: user.restaurants[0].logo,
                active: true
            };
        }
        return null;
    };

    const restaurantData = getRestaurantData();
    const isActive = (path) => location.pathname === path;

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    // Check if user is Owner or Manager
    const isOwnerOrManager = user?.role?.name === 'Owner' || user?.role?.name === 'Manager' || user?.role?.isSystem;

    // Check permissions
    const hasPermission = (perm) => {
        if (!user?.role) return false;
        if (typeof user.role === 'string') return ['owner', 'admin'].includes(user.role);
        return user.role.isSystem && (user.role.permissions?.includes('all') || user.role.permissions?.includes(perm));
    };

    // Build menu groups with permission-based filtering
    const menuGroups = [
        {
            title: 'OPERAÇÃO EM TEMPO REAL',
            items: [
                {
                    icon: LayoutDashboard,
                    label: t('owner_overview'),
                    path: '/owner-dashboard',
                    show: (user?.role?.name === 'Owner' || user?.role?.isSystem) && !['Waiter', 'Kitchen', 'Delivery'].includes(user?.role?.name)
                },
                {
                    icon: LayoutDashboard,
                    label: t('dashboard') || 'Painel Geral',
                    path: '/dashboard/analytics',
                    show: hasPermission('view_reports') || hasPermission('manage_settings')
                },
                {
                    icon: LayoutDashboard,
                    label: t('waiter_dashboard') || 'Dashboard de Garçom',
                    path: '/dashboard/waiter',
                    show: hasPermission('take_orders')
                },
                {
                    icon: UtensilsCrossed,
                    label: t('kitchen_monitor'),
                    path: '/dashboard/kitchen',
                    show: hasPermission('update_order_status')
                },
                {
                    icon: LayoutGrid,
                    label: t('hall_details') || 'Detalhes da Mesa',
                    path: '/dashboard/hall',
                    show: hasPermission('view_reports') || hasPermission('manage_tables')
                },
                {
                    icon: ShoppingBag,
                    label: t('orders'),
                    path: '/dashboard/orders',
                    show: hasPermission('manage_orders'),
                    isOrders: true
                },
                {
                    icon: Banknote,
                    label: t('payments'),
                    path: '/dashboard/payments',
                    show: hasPermission('manage_settings') || hasPermission('manage_orders')
                },
            ]
        },
        {
            title: '🍽️ GESTÃO DE MENU',
            items: [
                { icon: UtensilsCrossed, label: t('menu'), path: '/dashboard/menu', show: hasPermission('manage_menu') },
                { icon: Folder, label: t('categories'), path: '/dashboard/categories', show: hasPermission('manage_menu') },
                { icon: FolderTree, label: t('subcategories'), path: '/dashboard/subcategories', show: hasPermission('manage_menu') },
            ]
        },
        {
            title: '👥 CLIENTES & EXPERIÊNCIA',
            items: [
                {
                    icon: UsersIcon,
                    label: t('clients') || 'Clientes',
                    path: '/dashboard/clients',
                    show: hasPermission('view_reports') || hasPermission('manage_orders')
                },
                { icon: Star, label: t('feedback'), path: '/dashboard/feedback', show: hasPermission('manage_settings') },
                { icon: Tag, label: t('coupons'), path: '/dashboard/coupons', show: hasPermission('manage_settings') },
            ]
        },
        {
            title: '🚚 LOGÍSTICA & SERVIÇOS',
            items: [
                { icon: Truck, label: t('delivery'), path: '/dashboard/delivery', show: hasPermission('view_delivery_orders') || hasPermission('manage_orders') },
            ]
        },
        {
            title: '📦 CONTROLO FINANCEIRO & STOCK',
            items: [
                { icon: Package, label: t('stock_costs'), path: '/dashboard/stock', show: hasPermission('manage_settings') },
                { icon: FileText, label: t('reports'), path: '/dashboard/reports', show: hasPermission('view_reports') },
            ]
        },
        {
            title: '🪑 ESTRUTURA DO RESTAURANTE',
            items: [
                { icon: QrCode, label: t('tables'), path: '/dashboard/tables', show: hasPermission('manage_tables') },
            ]
        },
        {
            title: '👥 UTILIZADORES & SEGURANÇA',
            items: [
                { icon: UsersIcon, label: t('users'), path: '/dashboard/users', show: hasPermission('manage_staff') },
                { icon: Shield, label: t('profiles'), path: '/dashboard/profiles', show: hasPermission('manage_staff') },
            ]
        },
        {
            title: '⚙️ SISTEMA & ADMINISTRAÇÃO',
            items: [
                { icon: Settings, label: t('system_admin_hub') || 'Administração do Sistema', path: '/dashboard/settings', show: hasPermission('manage_settings') },
                { icon: CreditCard, label: t('subscription'), path: '/dashboard/subscription', show: (user?.role?.name === 'Owner' || user?.role?.isSystem) && !['Waiter', 'Kitchen', 'Delivery'].includes(user?.role?.name) },
            ]
        }
    ];

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

    let bannerOffset = 0;
    if (!isBackendConnected) {
        bannerOffset += 48;
    }
    if (showExpiredBanner && isOwnerOrManager) {
        bannerOffset += 60;
    } else if (showWarningBanner && isOwnerOrManager) {
        bannerOffset += 48;
    }

    return (
        <div className="dashboard-layout">
            <style>{`
                @keyframes urgent-pulse {
                    0% { background-color: rgba(220, 38, 38, 0.1); }
                    50% { background-color: rgba(220, 38, 38, 0.3); }
                    100% { background-color: rgba(220, 38, 38, 0.1); }
                }
                .nav-item.blink-urgent {
                    animation: urgent-pulse 1s infinite;
                    border-left: 4px solid #dc2626;
                }
                .nav-badge {
                    background: #10b981;
                    color: white;
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    border-radius: 999px;
                    margin-left: auto;
                    font-weight: bold;
                }
                .nav-section-title {
                    padding: 18px 24px 8px 24px;
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .nav-section-divider {
                    height: 1px;
                    background: rgba(226, 232, 240, 0.4);
                    margin: 8px 0;
                }
            `}</style>

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
                                        fontWeight: '700',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        textTransform: 'uppercase'
                                    }}>{restaurantData?.name?.charAt(0) || 'R'}</div>
                                )}
                                {/* Status Indicator */}
                                <div
                                    onClick={async () => {
                                        if (isOwnerOrManager) {
                                            try {
                                                const restaurantId = restaurantData?._id || restaurantData?.id;
                                                const response = await fetch(`http://localhost:5000/api/restaurants/${restaurantId}/toggle-active`, {
                                                    method: 'PATCH',
                                                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                                });
                                                if (response.ok) window.location.reload();
                                            } catch (error) { console.error('Failed to toggle:', error); }
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
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {restaurantData?.name || 'QR Menu'}
                                </h2>
                                <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {t('admin_panel')}
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: restaurantData?.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: restaurantData?.active ? '#10b981' : '#ef4444',
                                        fontWeight: '600',
                                        marginLeft: '4px',
                                        userSelect: 'none'
                                    }}>
                                        {restaurantData?.active ? t('active') || 'Ativo' : t('inactive') || 'Inativo'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuGroups.map((group, groupIdx) => {
                        const visibleItems = group.items.filter(item => item.show);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={groupIdx}>
                                <div className="nav-section-title">
                                    {group.title}
                                </div>
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const isOrders = item.isOrders === true;
                                    const shouldBlink = isOrders && isRinging;

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => {
                                                closeSidebar();
                                                if (isOrders) stopRinging();
                                            }}
                                            className={`nav-item ${isActive(item.path) ? 'active' : ''} ${shouldBlink ? 'blink-urgent' : ''}`}
                                        >
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                            {isOrders && pendingCount > 0 && (
                                                <span className="nav-badge">{pendingCount}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                                {groupIdx < menuGroups.length - 1 && <div className="nav-section-divider" />}
                            </div>
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
                        {/* Audio Toggle */}
                        <button
                            className="icon-btn"
                            onClick={toggleAudio}
                            title={audioEnabled ? "Silenciar" : "Ativar Som"}
                            style={{ opacity: audioEnabled ? 1 : 0.5 }}
                        >
                            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>

                        <LanguageSwitcher />

                        <div className="user-menu">
                            <User size={20} />
                            <span>{user?.email}</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    {/* Subscription Expiration Alert */}
                    {subscription && !isBlocked && (
                        <SubscriptionAlert subscription={subscription} />
                    )}

                    {isBlocked && !location.pathname.includes('/subscription') ? (
                        <SubscriptionBlocker
                            status={subscription?.status || 'expired'}
                            subscription={subscription}
                        />
                    ) : (
                        <Outlet />
                    )}
                </main>

                {/* Waiter Call Alerts - Real-time notifications */}
                <WaiterCallAlerts />
            </div>
        </div>
    );
}



