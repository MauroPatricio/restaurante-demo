import { useState, useEffect } from 'react';
import { CreditCard, Search, RefreshCw, AlertCircle, Calendar, Building2, User } from 'lucide-react';
import subscriptionAPI from '../services/subscriptionAPI';
import { useTranslation } from 'react-i18next';
import './Subscriptions.css';

const STATUS_COLORS = {
    trial: '#3b82f6',      // Blue
    active: '#10b981',     // Green
    suspended: '#f59e0b',  // Yellow/Orange
    cancelled: '#ef4444',  // Red
    expired: '#6b7280'     // Gray
};

const STATUS_TRANSLATIONS = {
    trial: { en: 'Trial', pt: 'Teste', es: 'Prueba' },
    active: { en: 'Active', pt: 'Ativa', es: 'Activa' },
    suspended: { en: 'Suspended', pt: 'Suspensa', es: 'Suspendida' },
    cancelled: { en: 'Cancelled', pt: 'Cancelada', es: 'Cancelada' },
    expired: { en: 'Expired', pt: 'Expirada', es: 'Expirada' }
};

export default function Subscriptions() {
    const { t, i18n } = useTranslation();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusChangeReason, setStatusChangeReason] = useState('');

    useEffect(() => {
        fetchSubscriptions();
    }, [statusFilter]);

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
            setError(err.response?.data?.message || 'Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchSubscriptions();
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

            // Refresh list
            await fetchSubscriptions();
            closeStatusModal();

            alert(`Subscription status updated to ${newStatus}`);
        } catch (err) {
            console.error('Failed to update status:', err);
            alert(err.response?.data?.message || 'Failed to update subscription status');
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDaysUntilExpiry = (daysUntilExpiry) => {
        if (daysUntilExpiry < 0) return { text: 'Expired', className: 'expired' };
        if (daysUntilExpiry === 0) return { text: 'Today', className: 'critical' };
        if (daysUntilExpiry <= 3) return { text: `${daysUntilExpiry} days`, className: 'critical' };
        if (daysUntilExpiry <= 7) return { text: `${daysUntilExpiry} days`, className: 'warning' };
        return { text: `${daysUntilExpiry} days`, className: 'normal' };
    };

    // Statistics
    const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        trial: subscriptions.filter(s => s.status === 'trial').length,
        suspended: subscriptions.filter(s => s.status === 'suspended').length,
        expired: subscriptions.filter(s => s.status === 'expired').length,
        expiringSoon: subscriptions.filter(s => s.daysUntilExpiry >= 0 && s.daysUntilExpiry <= 7).length
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h2>Subscription Management</h2>
                    <p>Manage all restaurant subscriptions</p>
                </div>
                <button onClick={fetchSubscriptions} className="btn-secondary">
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <div className="stat-card">
                    <h4>Total</h4>
                    <p className="stat-number">{stats.total}</p>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid ${STATUS_COLORS.active}` }}>
                    <h4>Active</h4>
                    <p className="stat-number" style={{ color: STATUS_COLORS.active }}>{stats.active}</p>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid ${STATUS_COLORS.trial}` }}>
                    <h4>Trial</h4>
                    <p className="stat-number" style={{ color: STATUS_COLORS.trial }}>{stats.trial}</p>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid ${STATUS_COLORS.suspended}` }}>
                    <h4>Suspended</h4>
                    <p className="stat-number" style={{ color: STATUS_COLORS.suspended }}>{stats.suspended}</p>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid ${STATUS_COLORS.expired}` }}>
                    <h4>Expired</h4>
                    <p className="stat-number" style={{ color: STATUS_COLORS.expired }}>{stats.expired}</p>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <h4>Expiring Soon</h4>
                    <p className="stat-number" style={{ color: '#f59e0b' }}>{stats.expiringSoon}</p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by restaurant name or email..."
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
                    <option value="all">All Status</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            {/* Subscriptions Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Loading subscriptions...</p>
                </div>
            ) : error ? (
                <div className="error-message">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            ) : subscriptions.length === 0 ? (
                <div className="empty-state">
                    <CreditCard size={48} style={{ opacity: 0.3 }} />
                    <p>No subscriptions found</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Restaurant</th>
                                <th>Owner</th>
                                <th>Status</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Days Left</th>
                                <th>Actions</th>
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
                                                style={{
                                                    backgroundColor: `${STATUS_COLORS[sub.status]}20`,
                                                    color: STATUS_COLORS[sub.status],
                                                    border: `1px solid ${STATUS_COLORS[sub.status]}`
                                                }}
                                            >
                                                {STATUS_TRANSLATIONS[sub.status]?.[i18n.language] || sub.status}
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
                                            <button
                                                onClick={() => openStatusModal(sub)}
                                                className="btn-small"
                                                style={{ width: '100%', justifyContent: 'center' }}
                                            >
                                                Change Status
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Change Status Modal */}
            {showStatusModal && selectedSubscription && (
                <div className="modal-overlay" onClick={closeStatusModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Change Subscription Status</h3>
                            <button onClick={closeStatusModal} className="icon-btn">×</button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                                <p style={{ marginBottom: '0.5rem' }}><strong>Restaurant:</strong> {selectedSubscription.restaurant?.name}</p>
                                <p><strong>Current Status:</strong> <span
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        backgroundColor: `${STATUS_COLORS[selectedSubscription.status]}20`,
                                        color: STATUS_COLORS[selectedSubscription.status]
                                    }}
                                >
                                    {STATUS_TRANSLATIONS[selectedSubscription.status]?.[i18n.language] || selectedSubscription.status}
                                </span></p>
                            </div>

                            <div className="form-group">
                                <label>New Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="trial">Trial</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>

                            {(newStatus === 'suspended' || newStatus === 'cancelled') && (
                                <div className="form-group">
                                    <label>Reason (Optional)</label>
                                    <textarea
                                        value={statusChangeReason}
                                        onChange={(e) => setStatusChangeReason(e.target.value)}
                                        placeholder="Enter reason for status change..."
                                        rows="3"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            )}

                            {(newStatus === 'suspended' || newStatus === 'cancelled' || newStatus === 'expired') && (
                                <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '8px', marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.9em', color: '#92400e', margin: 0 }}>
                                        <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                                        <strong>Warning:</strong> This will immediately block the restaurant's access to the system.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button onClick={closeStatusModal} className="btn-secondary">Cancel</button>
                            <button
                                onClick={handleStatusChange}
                                className="btn-primary"
                                disabled={newStatus === selectedSubscription.status}
                            >
                                Update Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
