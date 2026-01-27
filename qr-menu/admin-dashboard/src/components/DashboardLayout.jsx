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
    VolumeX,
    Lock,
    Store
} from 'lucide-react';
import { useConnectivity } from '../contexts/ConnectivityContext';
import SubscriptionBlockedScreen from './SubscriptionBlockedScreen';
import SubscriptionAlert from './SubscriptionAlert';
import { useSocket } from '../contexts/SocketContext';
import WaiterCallAlerts from './WaiterCallAlerts';
import { getStatusLabel, getStatusBadgeStyle } from '../utils/subscriptionStatusHelper';
import SubscriptionRenewalModal from './SubscriptionRenewalModal';
import RenewalNotifications from './RenewalNotifications';
import './DashboardLayout.css';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const { subscription, isBlocked, requiresRenewal, isExpiring } = useSubscription();
    const { isBackendConnected } = useConnectivity();
    const { pendingCount, isRinging, stopRinging, toggleAudio, audioEnabled } = useSocket();
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dismissedRenewalModal, setDismissedRenewalModal] = useState(false);

    // Blocking Logic
    const isSubscriptionPage = location.pathname.includes('/subscription');
    // Allow System Admin to bypass
    const isSystemAdmin = user?.role?.isSystem === true || user?.role?.name === 'System Admin';

    // Determine user type for the blocker screen
    const userType = (user?.role?.name === 'Owner' || user?.role?.isOwner) ? 'owner' : 'staff';

    // Show blocker if:
    // 1. Blocked
    // 2. Not System Admin
    // 3. Not on subscription page (so owners can pay) - OR if staff, always block
    const showBlocker = isBlocked && !requiresRenewal && !isSystemAdmin && (!isSubscriptionPage || userType === 'staff');
    const showRenewalModal = requiresRenewal && !isSystemAdmin && userType === 'owner' && !dismissedRenewalModal;
    const showExpiredBlockerForStaff = requiresRenewal && !isSystemAdmin && userType === 'staff';
    // Actually, if userType is staff, they can't pay, so block everywhere.
    // If owner, allow subscription page.



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
            title: t('real_time_operation') || 'OPERAÇÃO EM TEMPO REAL',
            items: [
                {
                    icon: LayoutDashboard,
                    label: t('owner_overview'),
                    path: '/owner-dashboard',
                    show: (user?.role?.name === 'Owner' || user?.role?.isSystem) && !['Waiter', 'Kitchen', 'Delivery'].includes(user?.role?.name),
                    isPremium: true
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
            title: t('menu_management_section') || '🍽️ GESTÃO DE MENU',
            items: [
                { icon: Folder, label: t('categories'), path: '/dashboard/categories', show: hasPermission('manage_menu') },
                { icon: FolderTree, label: t('subcategories'), path: '/dashboard/subcategories', show: hasPermission('manage_menu') },
                { icon: UtensilsCrossed, label: t('menu'), path: '/dashboard/menu', show: hasPermission('manage_menu') },
                { icon: Tag, label: t('coupons'), path: '/dashboard/coupons', show: hasPermission('manage_settings'), isPremium: true },
            ]
        },
        {
            title: t('clients_experience') || '👥 CLIENTES & EXPERIÊNCIA',
            items: [
                {
                    icon: UsersIcon,
                    label: t('clients') || 'Clientes',
                    path: '/dashboard/clients',
                    show: hasPermission('view_reports') || hasPermission('manage_orders')
                },
                { icon: Star, label: t('feedback'), path: '/dashboard/feedback', show: hasPermission('manage_settings'), isPremium: true },
            ]
        },
        {
            title: t('logistics_services') || '🚚 LOGÍSTICA & SERVIÇOS',
            items: [
                { icon: Truck, label: t('delivery'), path: '/dashboard/delivery', show: hasPermission('view_delivery_orders') || hasPermission('manage_orders') },
            ]
        },
        {
            title: t('financial_stock') || '📦 CONTROLO FINANCEIRO & STOCK',
            items: [
                { icon: Package, label: t('stock_costs'), path: '/dashboard/stock', show: hasPermission('manage_settings'), isPremium: true },
                { icon: FileText, label: t('reports'), path: '/dashboard/reports', show: hasPermission('view_reports'), isPremium: true },
            ]
        },
        {
            title: t('restaurant_structure') || '🪑 ESTRUTURA DO RESTAURANTE',
            items: [
                { icon: QrCode, label: t('tables'), path: '/dashboard/tables', show: hasPermission('manage_tables') },
            ]
        },
        {
            title: t('users_security') || '👥 UTILIZADORES & SEGURANÇA',
            items: [
                { icon: UsersIcon, label: t('users'), path: '/dashboard/users', show: hasPermission('manage_staff') },
                { icon: Shield, label: t('profiles'), path: '/dashboard/profiles', show: hasPermission('manage_staff') },
            ]
        },
        {
            title: t('system_administration') || '⚙️ SISTEMA & ADMINISTRAÇÃO',
            items: [
                { icon: Settings, label: t('system_admin_hub') || 'Administração do Sistema', path: '/dashboard/settings', show: hasPermission('manage_settings') && user?.role?.isSystem },
                { icon: CreditCard, label: t('subscription_management') || 'Gestão de Assinaturas', path: '/dashboard/subscriptions', show: user?.role?.name === 'System Admin' },
                { icon: CreditCard, label: t('subscription'), path: '/dashboard/subscription', show: user?.role?.isSystem || (['Owner', 'Manager'].includes(user?.role?.name)) },
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
        <div className={`dashboard-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>

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
                    {t('not_connected_api')}
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
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <CreditCardIcon size={16} />
                        {t('subscription_renew_now')}
                    </Link>

                    <Link to="/select-restaurant" style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '500',
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        transition: 'all 0.2s ease'
                    }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <LayoutGrid size={16} />
                        {t('back_to_restaurants')}
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
                    <div className="restaurant-info">
                        {restaurantData?.logo ? (
                            <img
                                src={restaurantData.logo}
                                alt={restaurantData.name}
                                className="restaurant-logo"
                                onError={(e) => {
                                    e.target.style.display = 'none'; // Hide broken image
                                    e.target.nextSibling.style.display = 'flex'; // Show fallback
                                }}
                            />
                        ) : null}

                        {/* Fallback Icon (shown if no logo or error) */}
                        <div className="restaurant-avatar" style={{ display: restaurantData?.logo ? 'none' : 'flex' }}>
                            <Store size={24} />
                        </div>

                        <div className="restaurant-details">
                            <h3>{restaurantData?.name || 'Restaurante'}</h3>
                            <div className="flex flex-col gap-1">
                                <span className="user-role">
                                    {user?.role?.name || user?.role || 'User'}
                                </span>
                                {subscription && (
                                    <span
                                        className="status-badge"
                                        style={{
                                            ...getStatusBadgeStyle(subscription.status),
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }}></span>
                                        {getStatusLabel(subscription.status, t)}
                                    </span>
                                )}
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
                                                // Close sidebar automatically on navigation - better UX
                                                closeSidebar();
                                                // Stop ringing for orders
                                                if (isOrders) stopRinging();
                                            }}
                                            className={`nav-item ${isActive(item.path) ? 'active' : ''} ${shouldBlink ? 'blink-urgent' : ''} ${item.isPremium && isExpiring ? 'premium-locked' : ''}`}
                                        >
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                            {item.isPremium && isExpiring && <Lock size={14} className="ml-auto text-orange-400" />}
                                            {isOrders && pendingCount > 0 && !isExpiring && (
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
                        <button
                            onClick={toggleSidebar}
                            className="icon-btn sidebar-toggle-btn"
                            style={{ background: 'transparent', border: 'none', padding: 0 }}
                            title={sidebarOpen ? t('collapse_menu') : t('expand_menu')}
                        >
                            {sidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
                        </button>
                        <h1 className="header-title">{t('welcome')}, {user?.name}</h1>
                    </div>

                    <div className="header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Audio Toggle */}
                        <button
                            className="icon-btn"
                            onClick={toggleAudio}
                            title={audioEnabled ? t('mute_alarm_label') : t('activate_sound_label')}
                            style={{ opacity: audioEnabled ? 1 : 0.5 }}
                        >
                            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>

                        {/* Renewal Notifications for Admins */}
                        {user?.role?.name === 'System Admin' && <RenewalNotifications />}

                        {/* Subscription Status in Header */}
                        {subscription && (
                            <div
                                style={{
                                    ...getStatusBadgeStyle(subscription.status),
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    border: ['expired', 'suspended'].includes(subscription.status) ? '1px solid currentColor' : 'none'
                                }}
                            >
                                {['expired', 'suspended'].includes(subscription.status) ? (
                                    <AlertCircle size={14} />
                                ) : (
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                                )}
                                {getStatusLabel(subscription.status, t)}
                            </div>
                        )}

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

                    <Outlet />
                </main>

                {/* Waiter Call Alerts - Real-time notifications */}
                <WaiterCallAlerts />

                {/* Blocking Overlay - Renders ON TOP of the dashboard */}
                {showBlocker && (
                    <SubscriptionBlockedScreen
                        userType={userType}
                        subscription={subscription}
                    />
                )}

                {/* Staff blocked for expired subscription */}
                {showExpiredBlockerForStaff && (
                    <SubscriptionBlockedScreen
                        userType="staff"
                        subscription={subscription}
                    />
                )}

                {/* Mandatory Renewal Modal for Owners */}
                {showRenewalModal && (
                    <SubscriptionRenewalModal
                        subscription={subscription}
                        onRenew={() => navigate('/dashboard/subscription')}
                        onCancel={() => setDismissedRenewalModal(true)}
                    />
                )}
            </div>
        </div>
    );
}
