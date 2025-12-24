import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionAPI } from '../services/api';
import { CreditCard, Calendar, CheckCircle, XCircle, X, History, Clock, Check, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import axios from 'axios'; // We might need axios directly if api.js isn't updated yet

export default function Subscription() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRenewModal, setShowRenewModal] = useState(false);

    useEffect(() => {
        if (user?.restaurant) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const [subRes, transRes] = await Promise.all([
                subscriptionAPI.get(user.restaurant._id || user.restaurant),
                subscriptionAPI.getHistory(user.restaurant._id || user.restaurant)
            ]);
            setSubscription(subRes.data.subscription);
            setTransactions(transRes.data.transactions);
        } catch (error) {
            console.error('Failed to fetch subscription data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading subscription...</div>;
    }

    const statusColor = {
        trial: 'blue',
        active: 'green',
        suspended: 'red',
        cancelled: 'gray'
    };

    const methodIcons = {
        mpesa: '📱 M-Pesa',
        emola: '📱 e-Mola',
        bci: '🏦 BCI'
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2>{t('subscription_management')}</h2>
                    <p>{t('subscription_page_desc')}</p>
                </div>
            </div>

            <div className="subscription-card">
                <div className="subscription-header">
                    <div>
                        <h3>{t('current_plan')}</h3>
                        <p className="subscription-amount">15,000 MT / month</p>
                    </div>
                    <span className={`status-badge ${statusColor[subscription?.status]}`}>
                        {subscription?.status}
                    </span>
                </div>

                <div className="subscription-details">
                    <div className="detail-row">
                        <div className="detail-label">
                            <Calendar size={18} />
                            <span>{t('current_period')}</span>
                        </div>
                        <div className="detail-value">
                            {subscription?.currentPeriodStart && format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')}
                            {' - '}
                            {subscription?.currentPeriodEnd && format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                        </div>
                    </div>

                    <div className="detail-row">
                        <div className="detail-label">
                            {subscription?.isValid ? <CheckCircle size={18} className="text-green" /> : <XCircle size={18} className="text-red" />}
                            <span>{t('status')}</span>
                        </div>
                        <div className="detail-value">
                            {subscription?.isValid ? t('plan_active') : t('plan_suspended')}
                        </div>
                    </div>

                    {!subscription?.isTrial && (
                        <div className="trial-notice">
                            <p>{t('trial_notice')}</p>
                            <p>{t('trial_msg')} {subscription?.currentPeriodEnd && format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}</p>
                        </div>
                    )}
                </div>

                {!subscription?.isValid && (
                    <div className="subscription-warning">
                        <h4>{t('subscription_suspended_title')}</h4>
                        <p>{t('subscription_suspended_msg')}</p>
                        <button className="btn-primary" onClick={() => setShowRenewModal(true)}>
                            <CreditCard size={18} />
                            {t('renew_subscription')}
                        </button>
                    </div>
                )}
                {/* Also allow renewal even if valid, to extend */}
                {subscription?.isValid && (
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={() => setShowRenewModal(true)}>
                            <CreditCard size={18} />
                            {t('renew_subscription')}
                        </button>
                    </div>
                )}
            </div>

            <div className="table-container" style={{ marginTop: '24px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={20} />
                        Payment History
                    </h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No payment history found</td></tr>
                        ) : (
                            transactions.map(tx => (
                                <tr key={tx._id}>
                                    <td>{format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                                    <td>{methodIcons[tx.method] || tx.method}</td>
                                    <td>{tx.reference}</td>
                                    <td>{tx.amount?.toLocaleString()} MT</td>
                                    <td>
                                        <span className={`status-badge ${tx.status === 'approved' || tx.status === 'completed' ? 'active' : (tx.status === 'rejected' ? 'inactive' : 'pending')}`}>
                                            {tx.status === 'pending' && <Clock size={12} style={{ marginRight: 4 }} />}
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showRenewModal && (
                <RenewModal
                    onClose={() => setShowRenewModal(false)}
                    t={t}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}

function RenewModal({ onClose, t, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState('mpesa'); // mpesa, emola, bci
    const [reference, setReference] = useState('');
    const [amount] = useState(15000); // Fixed for now

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await subscriptionAPI.createPayment({
                amount,
                method,
                reference
            });
            alert('Payment request submitted! Waiting for admin approval.');
            onSuccess();
            onClose();
        } catch (error) {
            alert('Failed to submit payment');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{t('renew_subscription')}</h3>
                    <button onClick={onClose} className="icon-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Select Payment Method</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                            <div
                                onClick={() => setMethod('mpesa')}
                                style={{
                                    border: `2px solid ${method === 'mpesa' ? '#ef4444' : '#eee'}`,
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                    background: method === 'mpesa' ? '#fef2f2' : 'white'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: '#dc2626' }}>M-Pesa</div>
                            </div>
                            <div
                                onClick={() => setMethod('emola')}
                                style={{
                                    border: `2px solid ${method === 'emola' ? '#fb923c' : '#eee'}`,
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                    background: method === 'emola' ? '#fff7ed' : 'white'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: '#ea580c' }}>e-Mola</div>
                            </div>
                            <div
                                onClick={() => setMethod('bci')}
                                style={{
                                    border: `2px solid ${method === 'bci' ? '#2563eb' : '#eee'}`,
                                    padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                    background: method === 'bci' ? '#eff6ff' : 'white'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: '#1d4ed8' }}>BCI</div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Amount (Monthly)</label>
                        <input type="text" value="15,000 MT" disabled style={{ background: '#f8fafc' }} />
                    </div>

                    {method === 'mpesa' && (
                        <div className="form-group">
                            <label>M-Pesa Number</label>
                            <input
                                type="text"
                                placeholder="841234567"
                                required
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                            />
                            <small>Enter the number you will pay from.</small>
                        </div>
                    )}

                    {method === 'emola' && (
                        <div className="form-group">
                            <label>e-Mola Number</label>
                            <input
                                type="text"
                                placeholder="861234567"
                                required
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                            />
                        </div>
                    )}

                    {method === 'bci' && (
                        <div className="form-group">
                            <label>Transaction Reference ID</label>
                            <input
                                type="text"
                                placeholder="BCI Reference..."
                                required
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                            />
                            <small>Please transfer to account 123456789 and enter ref.</small>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? t('processing') : t('process_payment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
