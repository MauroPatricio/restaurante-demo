import { useState, useEffect } from 'react';
import { CreditCard, Search, RefreshCw, AlertCircle, Calendar, Building2, User, History, CheckCircle, XCircle, PauseCircle, Clock, Users, Settings } from 'lucide-react';
import subscriptionAPI from '../services/subscriptionAPI';
import { useTranslation } from 'react-i18next';
import './Subscriptions.css';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStatusLabel, getStatusBadgeStyle } from '../utils/subscriptionStatusHelper';



export default function Subscriptions() {
    const { t, i18n } = useTranslation();
    const [viewMode, setViewMode] = useState('restaurants'); // 'restaurants' | 'owners'

    // Restaurants Data
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Owners Data
    const [owners, setOwners] = useState([]);
    const [basePrice, setBasePrice] = useState(1000);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusChangeReason, setStatusChangeReason] = useState('');

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Settings Modal
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [newBasePrice, setNewBasePrice] = useState(1000);

    useEffect(() => {
        if (viewMode === 'restaurants') {
            fetchSubscriptions();
        } else {
            fetchOwnersData();
        }
    }, [statusFilter, viewMode]);

    const fetchSubscriptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await subscriptionAPI.getAll({
                status: statusFilter,
                search: searchTerm
            });
            setSubscriptions(response.data.subscriptions || []);
        } catch (err) {
            console.error('Failed to fetch subscriptions:', err);
            setError(err.response?.data?.message || t('error_loading', 'Failed to load subscriptions'));
        } finally {
            setLoading(false);
        }
    };

    const fetchOwnersData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await subscriptionAPI.getOwnersSummary();
            setOwners(response.data.owners || []);
            setBasePrice(response.data.basePrice || 1000);
        } catch (err) {
            console.error('Failed to fetch owners:', err);
            setError(err.response?.data?.message || t('error_loading', 'Failed to load data'));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (viewMode === 'restaurants') {
            fetchSubscriptions();
        } else {
            // Client-side search for owners since backend might not support it yet or for simplicity
            // But if fetchOwnersData calls API, we should probably stick to client-side filtering for now as the endpoint is simple
            // Rerun fetch then filter? Or just filter current state?
            // Let's filter client side for owners for now as the list won't be huge
        }
    };

    const handleUpdateBasePrice = async () => {
        try {
            await subscriptionAPI.updateBasePrice(Number(newBasePrice));
            setBasePrice(Number(newBasePrice));
            setShowSettingsModal(false);
            fetchOwnersData(); // Refresh calculations
            alert(t('save_success', 'Saved successfully'));
        } catch (err) {
            console.error('Failed to update base price:', err);
            alert(t('error_saving', 'Failed to save settings'));
        }
    };

    const openStatusModal = (subscription) => {
        setSelectedSubscription(subscription);
        setNewStatus(subscription.status);
        setStatusChangeReason('');
        setShowStatusModal(true);
    };

    const closeStatusModal = () => {
        setShowStatusModal(false);
        setSelectedSubscription(null);
        setNewStatus('');
        setStatusChangeReason('');
    };

    const handleStatusChange = async () => {
        if (!selectedSubscription || !newStatus) return;
        try {
            await subscriptionAPI.updateStatus(
                selectedSubscription._id,
                newStatus,
                statusChangeReason
            );

            // Update local state instead of refreshing to preserve UI state (expanded rows, etc.)
            if (viewMode === 'restaurants') {
                setSubscriptions(prev => prev.map(sub =>
                    sub._id === selectedSubscription._id
                        ? { ...sub, status: newStatus }
                        : sub
                ));
            } else {
                setOwners(prevOwners => prevOwners.map(owner => ({
                    ...owner,
                    restaurants: owner.restaurants.map(r =>
                        r.subscriptionId === selectedSubscription._id
                            ? { ...r, status: newStatus }
                            : r
                    )
                })));
            }

            closeStatusModal();
            alert(t('subscription_status_updated', { status: newStatus }));
        } catch (err) {
            console.error('Failed to update status:', err);
            alert(err.response?.data?.message || 'Failed to update subscription status');
        }
    };

    const openHistoryModal = async (subscription) => {
        setSelectedSubscription(subscription);
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const response = await subscriptionAPI.getAuditLogs(subscription._id);
            setHistoryLogs(response.data.logs || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            alert('Failed to load history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const closeHistoryModal = () => {
        setShowHistoryModal(false);
        setSelectedSubscription(null);
        setHistoryLogs([]);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysUntilExpiry = (daysUntilExpiry) => {
        if (daysUntilExpiry < 0) return { text: t('subscription_status_expired'), className: 'expired' };
        if (daysUntilExpiry === 0) return { text: t('today'), className: 'critical' };
        if (daysUntilExpiry <= 3) return { text: `${daysUntilExpiry} ${t('days_label') || 'days'}`, className: 'critical' };
        if (daysUntilExpiry <= 7) return { text: `${daysUntilExpiry} ${t('days_label') || 'days'}`, className: 'warning' };
        return { text: `${daysUntilExpiry} ${t('days_label') || 'days'}`, className: 'normal' };
    };



    // Filtered Owners
    const filteredOwners = viewMode === 'owners'
        ? owners.filter(o =>
            o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    // Statistics
    const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        trial: subscriptions.filter(s => s.status === 'trial').length,
        suspended: subscriptions.filter(s => s.status === 'suspended').length,
        expired: subscriptions.filter(s => s.status === 'expired').length,
        expiringSoon: subscriptions.filter(s => s.daysUntilExpiry >= 0 && s.daysUntilExpiry <= 7).length
    };

    // Expanded Owner State
    const [expandedOwnerId, setExpandedOwnerId] = useState(null);

    const toggleOwnerExpansion = (ownerId) => {
        setExpandedOwnerId(expandedOwnerId === ownerId ? null : ownerId);
    };

    const handleRestaurantAction = (restaurant, action) => {
        // Construct a synthetic subscription object for the modal
        const syntheticSub = {
            _id: restaurant.subscriptionId,
            status: restaurant.status,
            restaurant: {
                _id: restaurant.id,
                name: restaurant.name
            }
        };
        openStatusModal(syntheticSub);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                {/* ... existing header code ... */}
                <div>
                    <h2>{viewMode === 'restaurants' ? t('subscription_management') : t('subscription_owners_title')}</h2>
                    <p>{viewMode === 'restaurants' ? t('subscription_page_desc') : t('subscription_owners_desc')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {viewMode === 'owners' && (
                        <button onClick={() => { setNewBasePrice(basePrice); setShowSettingsModal(true); }} className="btn-secondary">
                            <Settings size={18} />
                            {t('base_price')}: {basePrice} Mt
                        </button>
                    )}
                    <button onClick={viewMode === 'restaurants' ? fetchSubscriptions : fetchOwnersData} className="btn-secondary">
                        <RefreshCw size={18} />
                        {t('refresh_btn', 'Refresh')}
                    </button>
                </div>
            </div>

            {/* View Tabs */}
            <div className="view-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                <button
                    className={`tab-btn ${viewMode === 'restaurants' ? 'active' : ''}`}
                    onClick={() => setViewMode('restaurants')}
                    style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: viewMode === 'restaurants' ? '2px solid #3b82f6' : 'none',
                        color: viewMode === 'restaurants' ? '#3b82f6' : '#6b7280',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Building2 size={18} />
                    {t('view_restaurants')}
                </button>
                <button
                    className={`tab-btn ${viewMode === 'owners' ? 'active' : ''}`}
                    onClick={() => setViewMode('owners')}
                    style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: viewMode === 'owners' ? '2px solid #3b82f6' : 'none',
                        color: viewMode === 'owners' ? '#3b82f6' : '#6b7280',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Users size={18} />
                    {t('view_owners')}
                </button>
            </div>

            {viewMode === 'restaurants' && (
                <>
                    {/* Statistics Cards */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        <div className="stat-card">
                            <h4>{t('total')}</h4>
                            <p className="stat-number">{stats.total}</p>
                        </div>
                        <div className="stat-card" style={{ borderLeft: `4px solid ${getStatusBadgeStyle('active').color}` }}>
                            <h4>{t('subscription_status_active')}</h4>
                            <p className="stat-number" style={{ color: getStatusBadgeStyle('active').color }}>{stats.active}</p>
                        </div>
                        <div className="stat-card" style={{ borderLeft: `4px solid ${getStatusBadgeStyle('trial').color}` }}>
                            <h4>{t('subscription_status_trial')}</h4>
                            <p className="stat-number" style={{ color: getStatusBadgeStyle('trial').color }}>{stats.trial}</p>
                        </div>
                        <div className="stat-card" style={{ borderLeft: `4px solid ${getStatusBadgeStyle('suspended').color}` }}>
                            <h4>{t('subscription_status_suspended')}</h4>
                            <p className="stat-number" style={{ color: getStatusBadgeStyle('suspended').color }}>{stats.suspended}</p>
                        </div>
                        <div className="stat-card" style={{ borderLeft: `4px solid ${getStatusBadgeStyle('expired').color}` }}>
                            <h4>{t('subscription_status_expired')}</h4>
                            <p className="stat-number" style={{ color: getStatusBadgeStyle('expired').color }}>{stats.expired}</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '300px' }}>
                            <div className="search-bar">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder={t('search_placeholder', 'Search by restaurant name or email...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        >
                            <option value="all">{t('all_filter', 'All Status')}</option>
                            <option value="trial">{t('subscription_status_trial')}</option>
                            <option value="active">{t('subscription_status_active')}</option>
                            <option value="suspended">{t('subscription_status_suspended')}</option>
                            <option value="cancelled">{t('subscription_status_cancelled', 'Cancelled')}</option>
                            <option value="expired">{t('subscription_status_expired')}</option>
                        </select>
                    </div>
                </>
            )}

            {/* View Content */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', minHeight: '400px' }}>
                    <LoadingSpinner size={48} />
                    <p>{t('loading_data')}</p>
                </div>
            ) : error ? (
                <div className="error-message">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            ) : viewMode === 'restaurants' ? (
                // RESTAURANTS TABLE
                subscriptions.length === 0 ? (
                    <div className="empty-state">
                        <CreditCard size={48} style={{ opacity: 0.3 }} />
                        <p>{t('no_subscriptions', 'No subscriptions found')}</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{t('restaurant_structure')}</th>
                                    <th>{t('owner_overview')}</th>
                                    <th>{t('status')}</th>
                                    <th>{t('subscription_period_start')}</th>
                                    <th>{t('subscription_period_end')}</th>
                                    <th>{t('days_remaining')}</th>
                                    <th>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map((sub) => {
                                    const expiryInfo = getDaysUntilExpiry(sub.daysUntilExpiry);

                                    return (
                                        <tr key={sub._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Building2 size={16} />
                                                    <div>
                                                        <div className="font-medium">{sub.restaurant?.name || 'N/A'}</div>
                                                        <div style={{ fontSize: '0.85em', color: '#666' }}>{sub.restaurant?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <User size={14} />
                                                    {sub.restaurant?.owner?.name || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className="status-badge"
                                                    style={getStatusBadgeStyle(sub.status)}
                                                >
                                                    {getStatusLabel(sub.status, t)}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Calendar size={14} />
                                                    {formatDate(sub.currentPeriodStart)}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Calendar size={14} />
                                                    {formatDate(sub.currentPeriodEnd)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`expiry-indicator ${expiryInfo.className}`}>
                                                    {expiryInfo.text}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => openStatusModal(sub)}
                                                        className="btn-small"
                                                        title={t('subscription_change_status')}
                                                    >
                                                        <CheckCircle size={14} />
                                                        {t('subscription_change_status')}
                                                    </button>
                                                    <button
                                                        onClick={() => openHistoryModal(sub)}
                                                        className="btn-small btn-secondary"
                                                        title={t('subscription_history')}
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                // OWNERS TABLE
                <>
                    <div style={{ marginBottom: '1rem', display: 'flex' }}>
                        <div className="search-bar" style={{ flex: 1, maxWidth: '400px' }}>
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder={t('search_placeholder', 'Search...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {filteredOwners.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} style={{ opacity: 0.3 }} />
                            <p>{t('no_results', 'No results found')}</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}></th>
                                        <th>{t('owner_overview')}</th>
                                        <th>{t('email')}</th>
                                        <th>{t('subscription_restaurants_count')}</th>
                                        <th>{t('subscription_total_amount')}</th>
                                        <th>{t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOwners.map((owner) => (
                                        <>
                                            <tr key={owner.id}
                                                onClick={() => toggleOwnerExpansion(owner.id)}
                                                style={{ cursor: 'pointer', backgroundColor: expandedOwnerId === owner.id ? '#f9fafb' : 'transparent' }}
                                            >
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        transform: expandedOwnerId === owner.id ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s',
                                                        display: 'inline-block'
                                                    }}>▶</div>
                                                </td>
                                                <td className="font-medium">{owner.name}</td>
                                                <td>{owner.email}</td>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: '#f3f4f6',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600
                                                    }}>
                                                        {owner.restaurantCount}
                                                    </span>
                                                </td>
                                                <td className="font-bold">
                                                    {owner.totalAmount.toLocaleString()} Mt
                                                </td>
                                                <td>
                                                    <span
                                                        className="status-badge"
                                                        style={getStatusBadgeStyle(owner.status)}
                                                    >
                                                        {getStatusLabel(owner.status, t)}
                                                    </span>
                                                </td>
                                            </tr>
                                            {expandedOwnerId === owner.id && (
                                                <tr style={{ backgroundColor: '#f9fafb' }}>
                                                    <td colSpan="6" style={{ padding: '0 1rem 1rem 1rem' }}>
                                                        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                                <thead style={{ backgroundColor: '#f3f4f6' }}>
                                                                    <tr>
                                                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>{t('restaurant_structure')}</th>
                                                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>{t('type')}</th>
                                                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>{t('amount')}</th>
                                                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>{t('status')}</th>
                                                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>{t('actions')}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {owner.restaurants.map((rest, idx) => (
                                                                        <tr key={rest.id} style={{ borderBottom: idx < owner.restaurants.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                                <div style={{ fontWeight: '500' }}>{rest.name}</div>
                                                                                <div style={{ fontSize: '0.8em', color: '#6b7280' }}>ID: ...{rest.id?.toString().slice(-6)}</div>
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                                {rest.priceType === 'main' ? (
                                                                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontWeight: '600' }}>
                                                                                        {t('price_main', 'Primary')} (100%)
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: '#f3f4f6', color: '#374151', fontWeight: '600' }}>
                                                                                        {t('price_additional', 'Additional')} (50%)
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                                                                                {rest.currentAmount?.toLocaleString()} Mt
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                                <span style={{
                                                                                    fontSize: '0.75rem',
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '4px',
                                                                                    ...getStatusBadgeStyle(rest.status)
                                                                                }}>
                                                                                    {getStatusLabel(rest.status, t)}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                                    <button
                                                                                        className="btn-small"
                                                                                        onClick={(e) => { e.stopPropagation(); handleRestaurantAction(rest); }}
                                                                                        title={t('manage')}
                                                                                    >
                                                                                        <Settings size={14} />
                                                                                        {t('manage')}
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr >
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )
            }

            {/* Change Status Modal */}
            {
                showStatusModal && selectedSubscription && (
                    <div className="modal-overlay" onClick={closeStatusModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h3>{t('subscription_change_status')}</h3>
                                <button onClick={closeStatusModal} className="icon-btn">×</button>
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                                    <p style={{ marginBottom: '0.5rem' }}><strong>{t('restaurant_structure')}:</strong> {selectedSubscription.restaurant?.name}</p>
                                    <p><strong>{t('status')}:</strong> <span
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px',
                                            ...getStatusBadgeStyle(selectedSubscription.status)
                                        }}
                                    >
                                        {getStatusLabel(selectedSubscription.status, t)}
                                    </span></p>
                                </div>

                                <div className="form-group">
                                    <label>{t('status')}</label>
                                    <select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="trial">{t('subscription_status_trial')}</option>
                                        <option value="active">{t('subscription_status_active')}</option>
                                        <option value="suspended">{t('subscription_status_suspended')}</option>
                                        <option value="cancelled">{t('subscription_status_cancelled', 'Cancelled')}</option>
                                        <option value="expired">{t('subscription_status_expired')}</option>
                                    </select>
                                </div>

                                {(newStatus === 'suspended' || newStatus === 'cancelled') && (
                                    <div className="form-group">
                                        <label>{t('subscription_reason_label')}</label>
                                        <textarea
                                            value={statusChangeReason}
                                            onChange={(e) => setStatusChangeReason(e.target.value)}
                                            placeholder={t('subscription_reason_placeholder')}
                                            rows="3"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                )}

                                {(newStatus === 'suspended' || newStatus === 'cancelled' || newStatus === 'expired') && (
                                    <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '8px', marginTop: '1rem' }}>
                                        <p style={{ fontSize: '0.9em', color: '#92400e', margin: 0 }}>
                                            <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                                            <strong>{t('warning', 'Warning')}:</strong> {t('subscription_warning_block')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button onClick={closeStatusModal} className="btn-secondary">{t('cancel')}</button>
                                <button
                                    onClick={handleStatusChange}
                                    className="btn-primary"
                                    disabled={newStatus === selectedSubscription.status}
                                >
                                    {t('subscription_update_btn')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* History Modal */}
            {
                showHistoryModal && selectedSubscription && (
                    <div className="modal-overlay" onClick={closeHistoryModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%' }}>
                            <div className="modal-header">
                                <h3>{t('subscription_audit_logs')} - {selectedSubscription.restaurant?.name}</h3>
                                <button onClick={closeHistoryModal} className="icon-btn">×</button>
                            </div>

                            <div style={{ padding: '1.5rem', maxHeight: '600px', overflowY: 'auto' }}>
                                {loadingHistory ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                        <LoadingSpinner size={32} />
                                    </div>
                                ) : historyLogs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                        <History size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                        <p>{t('subscription_no_history')}</p>
                                    </div>
                                ) : (
                                    <table className="data-table" style={{ fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr>
                                                <th>{t('date')}</th>
                                                <th>{t('subscription_log_user')}</th>
                                                <th>{t('subscription_log_action')}</th>
                                                <th>{t('subscription_log_details')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyLogs.map((log) => (
                                                <tr key={log._id}>
                                                    <td>{formatDateTime(log.timestamp)}</td>
                                                    <td>
                                                        <div className="font-medium text-sm">{log.user?.name || log.user?.email || 'System'}</div>
                                                        <div className="text-xs text-gray-500">{log.user?.email}</div>
                                                    </td>
                                                    <td>
                                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {log.changes ? (
                                                            <div className="text-xs">
                                                                {log.changes.oldValue && (
                                                                    <div className="text-red-600 line-through mr-1 inline">
                                                                        {log.changes.oldValue}
                                                                    </div>
                                                                )}
                                                                {log.changes.newValue && (
                                                                    <div className="text-green-600 font-bold inline">
                                                                        → {log.changes.newValue}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="modal-actions" style={{ borderTop: '1px solid #e5e7eb', marginTop: 0 }}>
                                <button onClick={closeHistoryModal} className="btn-secondary">{t('close')}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Base Price Settings Modal */}
            {
                showSettingsModal && (
                    <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <h3>{t('subscription_base_price_update')}</h3>
                                <button onClick={() => setShowSettingsModal(false)} className="icon-btn">×</button>
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                <div className="form-group">
                                    <label>{t('subscription_base_price_label')}</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={newBasePrice}
                                            onChange={(e) => setNewBasePrice(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <span className="font-medium">Mt</span>
                                    </div>
                                    <p style={{ fontSize: '0.85em', color: '#666', marginTop: '0.5rem' }}>
                                        {t('subscription_base_price_help')}
                                    </p>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button onClick={() => setShowSettingsModal(false)} className="btn-secondary">{t('cancel')}</button>
                                <button onClick={handleUpdateBasePrice} className="btn-primary">
                                    {t('subscription_save_settings')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
