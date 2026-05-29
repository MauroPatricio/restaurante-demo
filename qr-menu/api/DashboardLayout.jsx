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
    Store,
    BedDouble,
    Landmark,
    Info,
    ChefHat,
    TrendingUp,
    Eye,
    EyeOff
} from 'lucide-react';
import { useConnectivity } from '../contexts/ConnectivityContext';
import SubscriptionBlockedScreen from './SubscriptionBlockedScreen';
import SubscriptionAlert from './SubscriptionAlert';
import { useSocket } from '../contexts/SocketContext';
import { useCurrency } from '../contexts/CurrencyContext';
import WaiterCallAlerts from './WaiterCallAlerts';
import { getStatusLabel, getStatusBadgeStyle } from '../utils/subscriptionStatusHelper';
import SubscriptionRenewalModal from './SubscriptionRenewalModal';
import RenewalNotifications from './RenewalNotifications';
import './DashboardLayout.css';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const { subscription, isBlocked, requiresRenewal, isExpiring } = useSubscription();
    const { isBackendConnected } = useConnectivity();
    const { dineInPendingCount, roomPendingCount, isRinging, stopRinging, toggleAudio, audioEnabled } = useSocket();
    const { systemCurrency } = useCurrency();
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    // Persist sidebar state across navigations and refreshes
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebar_open');
            // Default: open on desktop, closed on mobile
            if (saved !== null) return saved === 'true';
            return window.innerWidth >= 1024;
        } catch {
            return window.innerWidth >= 1024;
        }
    });
    const [dismissedRenewalModal, setDismissedRenewalModal] = useState(false);

    // Blocking Logic
    const allowedBlockedPaths = [
        '/dashboard/subscription',
        '/dashboard/waiter',
        '/dashboard/kitchen',
        '/dashboard/hall',
        '/dashboard/orders',
        '/dashboard/payments'
    ];
    const isAllowedPageUnderBlock = allowedBlockedPaths.some(path => location.pathname.startsWith(path));
    // Allow System Admin to bypass
    const isSystemAdmin = user?.role?.isSystem === true || user?.role?.name === 'System Admin' || user?.role?.name === 'Admin';

    // Determine user type for the blocker screen
    const userType = (['Owner', 'Admin'].includes(user?.role?.name || user?.role) || user?.role?.isOwner) ? 'owner' : 'staff';

    // Show blocker if:
    // 1. Blocked (including expired)
    // 2. Not System Admin
    // 3. Not on an allowed page
    const showBlocker = isBlocked && !isSystemAdmin && !isAllowedPageUnderBlock;
    const showRenewalModal = false; // Disabled as showBlocker now enforces mandatory block and directs to subscription page
    const showExpiredBlockerForStaff = requiresRenewal && !isSystemAdmin && userType === 'staff' && !isAllowedPageUnderBlock;
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

    const toggleSidebar = () => setSidebarOpen(prev => {
        const next = !prev;
        try { localStorage.setItem('sidebar_open', String(next)); } catch {}
        return next;
    });
    // Only close on mobile (overlay tap) — never auto-close on navigation
    const closeSidebarMobile = () => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
            try { localStorage.setItem('sidebar_open', 'false'); } catch {}
        }
    };

    // Robust check for Managerial/Ownership roles
    const isOwnerOrManager = ['Owner', 'Manager', 'Admin'].includes(user?.role?.name || user?.role) || user?.role?.isSystem;

    // Secure rule for who can see the subscription alert banner (excludes Manager)
    const canManageSubscription = ['Owner', 'Admin'].includes(user?.role?.name || user?.role) || isSystemAdmin;
    
    // Check permissions
    const hasPermission = (perm) => {
        if (!user?.role) return false;
        if (typeof user.role === 'string') return ['Owner', 'Admin', 'owner', 'admin'].includes(user.role);
        
        // Se for um Super Admin do Sistema ou possuir a permissão suprema 'all'
        if (user.role.isSystem || user.role.permissions?.includes('all')) return true;
        
        // Base nativa do RBAC: verifica se a permissão existe especificamente neste perfil
        return user.role.permissions?.includes(perm) || false;
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
                    label: t('dashboard_general'),
                    path: '/dashboard/analytics',
                    show: hasPermission('view_reports') || hasPermission('manage_settings')
                },
                {
                    icon: LayoutDashboard,
                    label: t('waiter_dashboard_label'),
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
                    label: t('hall_details_label'),
                    path: '/dashboard/hall',
                    show: hasPermission('view_reports') || hasPermission('manage_tables')
                },
                {
                    icon: ShoppingBag,
                    label: t('orders'),
                    path: '/dashboard/orders',
                    show: hasPermission('manage_orders') || ['Cashier', 'Caixa'].includes(user?.role?.name || user?.role),
                    isOrders: true,
                    orderSource: 'dine-in'
                },
                {
                    icon: Banknote,
                    label: t('payments'),
                    path: '/dashboard/payments',
                    show: hasPermission('manage_settings') || hasPermission('manage_orders') || ['Cashier', 'Caixa'].includes(user?.role?.name || user?.role)
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
                    label: t('clients_label'),
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
                { icon: Package, label: t('stock_costs'), path: '/dashboard/stock-management', show: hasPermission('manage_settings') || ['Stock', 'Estoquista'].includes(user?.role?.name || user?.role), isPremium: true },
                { icon: Landmark, label: t('accounting_fiscal'), path: '/dashboard/accounting', show: (['MT', 'MZN'].includes(systemCurrency?.toUpperCase())) && (['Owner', 'Manager', 'Contabilista'].includes(user?.role?.name || user?.role) || user?.role?.isSystem), isPremium: true },
                { icon: FileText, label: t('reports'), path: '/dashboard/reports', show: hasPermission('view_reports'), isPremium: true },
                { icon: CreditCard, label: t('subscription'), path: '/dashboard/subscription', show: canManageSubscription },
            ]
        },
        {
            title: t('restaurant_structure') || '🪑 ESTRUTURA DO RESTAURANTE',
            items: [
                { icon: QrCode, label: t('tables'), path: '/dashboard/tables', show: hasPermission('manage_tables') },
            ]
        },
        {
            title: t('room_service'),
            items: [
                { icon: BedDouble, label: t('room_management'), path: '/dashboard/room-service', show: hasPermission('manage_tables') || hasPermission('manage_settings') },
                { icon: ShoppingBag, label: t('room_orders'), path: '/dashboard/room-orders', show: hasPermission('manage_orders') || hasPermission('view_orders'), isOrders: true, orderSource: 'room' },
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
            title: '📊 STAFF & DESEMPENHO',
            items: [
                {
                    icon: TrendingUp,
                    label: t('nav_waiter_analytics'),
                    path: '/dashboard/waiter-analytics',
                    show: hasPermission('view_reports') || hasPermission('manage_staff')
                },
                {
                    icon: ChefHat,
                    label: t('nav_kitchen_analytics'),
                    path: '/dashboard/kitchen-analytics',
                    show: hasPermission('view_reports') || hasPermission('manage_staff')
                }
            ]
        },
        {
            title: t('system_administration') || '⚙️ SISTEMA & ADMINISTRAÇÃO',
            items: [
                { icon: Settings, label: t('system_admin_hub'), path: '/dashboard/settings', show: hasPermission('manage_settings') && user?.role?.isSystem },
            { icon: CreditCard, label: t('subscription_management_admin') || 'Gestão de Assinaturas', path: '/dashboard/subscriptions', show: isSystemAdmin },
                { icon: Info, label: t('about_us'), path: '/dashboard/about-us', show: true },
            ]
        }
    ];

    let bannerOffset = 0;
    if (!isBackendConnected) {
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

            {/* Mobile Overlay — only visible (and functional) on mobile */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                style={{ top: `${bannerOffset}px` }}
                onClick={closeSidebarMobile}
            />

            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarOpen ? 'open' : ''}`}
                style={{
                    top: !isBackendConnected ? '48px' : '0',
                    height: !isBackendConnected ? 'calc(100vh - 48px)' : '100vh'
                }}
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
                            <h3>{restaurantData?.name || t('restaurant')}</h3>
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

                                    // Subscription lock check
                                    const isBlockedFeature = isBlocked && !isSystemAdmin && !allowedBlockedPaths.some(path => item.path.startsWith(path));

                                    return (
                                        <Link
                                            key={item.path}
                                            to={isBlockedFeature ? '#' : item.path}
                                            onClick={(e) => {
                                                if (isBlockedFeature) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                // On mobile: close sidebar after navigation
                                                // On desktop: keep sidebar open (persistent)
                                                closeSidebarMobile();
                                                // Stop ringing for orders
                                                if (isOrders) stopRinging();
                                            }}
                                            className={`nav-item ${isActive(item.path) ? 'active' : ''} ${shouldBlink ? 'blink-urgent' : ''} ${(item.isPremium && isExpiring) || isBlockedFeature ? 'premium-locked' : ''} ${isBlockedFeature ? 'subscription-locked' : ''}`}
                                            style={isBlockedFeature ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'auto' } : {}}
                                        >
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                            {isBlockedFeature ? (
                                                <Lock size={14} style={{ marginLeft: 'auto', color: '#ef4444' }} />
                                            ) : (
                                                item.isPremium && isExpiring && <Lock size={14} className="ml-auto text-orange-400" />
                                            )}
                                            {isOrders && !isExpiring && !isBlockedFeature && (
                                                <>
                                                    {item.orderSource === 'room' ? (
                                                        roomPendingCount > 0 && <span className="nav-badge">{roomPendingCount}</span>
                                                    ) : (
                                                        dineInPendingCount > 0 && <span className="nav-badge">{dineInPendingCount}</span>
                                                    )}
                                                </>
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
                style={{
                    marginTop: !isBackendConnected ? '48px' : '0'
                }}
            >
                {/* Header */}
                <header className="header">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={toggleSidebar}
                            className="icon-btn sidebar-toggle-btn"
                            title={sidebarOpen ? t('collapse_menu') : t('expand_menu')}
                        >
                            {sidebarOpen ? <EyeOff size={22} /> : <Eye size={22} />}
                        </button>
                        <h1 className="header-title">{t('welcome_user', { name: user?.name })}</h1>
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
                <main className="page-content animate-fade-in">
                    {/* Subscription Expiration Alert */}
                    {subscription && !isBlocked && (
                        <SubscriptionAlert subscription={subscription} />
                    )}

                    <Outlet />
                </main>

                {/* Waiter Call Alerts - Real-time notifications */}
                <WaiterCallAlerts />
            </div>

            {/* Blocking Overlay - Renders at root layout level to cover the entire page (including sidebar) */}
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
    );
}
