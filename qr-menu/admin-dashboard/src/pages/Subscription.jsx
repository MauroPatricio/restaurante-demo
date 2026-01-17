import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { subscriptionAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    CreditCard,
    Calendar,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    TrendingUp,
    Check
} from 'lucide-react';

export default function Subscription() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { subscription: contextSub, refreshSubscription } = useSubscription();
    const [subscription, setSubscription] = useState(null);
    const [systemPrice, setSystemPrice] = useState(1500); // Default fallback
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [renewLoading, setRenewLoading] = useState(false);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewSuccess, setRenewSuccess] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('mpesa');

    useEffect(() => {
        if (user?.restaurant) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const restaurantId = user.restaurant._id || user.restaurant.id || user.restaurant;
            const { data } = await subscriptionAPI.get(restaurantId);
            setSubscription(data.subscription);
            setSystemPrice(data.systemPrice || 1500);
            setPaymentHistory(data.subscription.paymentHistory || []);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        setRenewLoading(true);
        try {
            const restaurantId = user.restaurant._id || user.restaurant.id || user.restaurant;
            const { data } = await subscriptionAPI.renew({
                restaurantId,
                paymentMethod: selectedMethod,
                amount: systemPrice,
                reference: `RENEW-${Date.now()}`
            });

            if (data.success || data.message) {
                setRenewSuccess(true);
                setTimeout(() => {
                    setShowRenewModal(false);
                    setRenewSuccess(false);
                    fetchData();
                    refreshSubscription();
                }, 2000);
            }
        } catch (error) {
            console.error('Renewal failed:', error);
            alert(t('error_generic') || 'Erro ao renovar subscrição. Tente novamente.');
        } finally {
            setRenewLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', minHeight: '80vh' }}>
                <LoadingSpinner size={48} message={t('loading_subscription')} />
            </div>
        );
    }

    const getDaysUntilExpiry = () => {
        if (!subscription?.currentPeriodEnd) return null;
        const now = new Date();
        const end = new Date(subscription.currentPeriodEnd);
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntil = getDaysUntilExpiry();
    const isExpired = daysUntil !== null && daysUntil <= 0;
    const isExpiring = daysUntil !== null && daysUntil <= 7 && daysUntil > 0;

    const getStatusConfig = () => {
        // Priority: Internal Status from Backend
        const status = subscription?.status;

        if (status === 'pending_activation') {
            return {
                label: t('subscription_status_pending') || 'Pendente de Autorização',
                color: '#2563eb', // Blue
                bgColor: '#eff6ff',
                icon: Clock
            };
        }

        if (status === 'expired' || isExpired) {
            return {
                label: t('subscription_status_expired'),
                color: '#dc2626',
                bgColor: '#fef2f2',
                icon: XCircle
            };
        }

        if (isExpiring && status === 'active') { // Only show expiring warning if active
            return {
                label: t('subscription_status_expiring'),
                color: '#f59e0b',
                bgColor: '#fffbeb',
                icon: AlertTriangle
            };
        }

        if (status === 'active') {
            return {
                label: t('subscription_status_active'),
                color: '#059669',
                bgColor: '#f0fdf4',
                icon: CheckCircle
            };
        }

        return {
            label: status || t('subscription_status_suspended'),
            color: '#64748b',
            bgColor: '#f8fafc',
            icon: Clock
        };
    };

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;
    const isPending = subscription?.status === 'pending_activation';

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return `${amount?.toLocaleString() || '0'} MT`;
    };

    return (
        <div style={styles.pageContainer}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>{t('subscription_title')}</h1>
                    <p style={styles.subtitle}>{t('subscription_subtitle')}</p>
                </div>
            </div>

            {/* Status Card */}
            <div style={styles.statusCard}>
                <div style={styles.statusCardLeft}>
                    <div style={{
                        ...styles.statusIconContainer,
                        backgroundColor: statusConfig.bgColor
                    }}>
                        <StatusIcon size={32} color={statusConfig.color} />
                    </div>
                    <div>
                        <p style={styles.statusLabel}>{t('status')}</p>
                        <h2 style={{ ...styles.statusValue, color: statusConfig.color }}>
                            {statusConfig.label}
                        </h2>
                    </div>
                </div>

                {/* Countdown */}
                {!isPending && daysUntil !== null && daysUntil > 0 && (
                    <div style={styles.countdown}>
                        <div style={styles.countdownNumber}>{daysUntil}</div>
                        <div style={styles.countdownLabel}>
                            {t('subscription_days_remaining')}
                        </div>
                    </div>
                )}

                {!isPending && isExpired && (
                    <div style={{ ...styles.countdown, backgroundColor: '#fef2f2', borderColor: '#dc2626' }}>
                        <div style={{ ...styles.countdownNumber, color: '#dc2626' }}>
                            {Math.abs(daysUntil)}
                        </div>
                        <div style={{ ...styles.countdownLabel, color: '#dc2626' }}>
                            {t('subscription_days_expired')}
                        </div>
                    </div>
                )}
            </div>

            {/* Details Grid */}
            <div style={styles.grid}>
                {/* Subscription Details Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <CreditCard size={24} color="#3b82f6" />
                        <h3 style={styles.cardTitle}>{t('subscription_details_title')}</h3>
                    </div>

                    <div style={styles.cardBody}>
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>{t('subscription_plan')}</span>
                            <span style={styles.detailValue}>Standard</span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>{t('subscription_monthly_amount')}</span>
                            <span style={{ ...styles.detailValue, fontWeight: '700', color: '#3b82f6' }}>
                                {formatCurrency(systemPrice)}
                            </span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>{t('subscription_currency')}</span>
                            <span style={styles.detailValue}>{subscription?.currency || 'MT'}</span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>{t('subscription_period_start')}</span>
                            <span style={styles.detailValue}>{formatDate(subscription?.currentPeriodStart)}</span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>{t('subscription_period_end')}</span>
                            <span style={styles.detailValue}>{formatDate(subscription?.currentPeriodEnd)}</span>
                        </div>
                    </div>

                    <div style={styles.cardFooter}>
                        {isPending ? (
                            <div style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#eff6ff',
                                borderRadius: '8px',
                                textAlign: 'center',
                                color: '#2563eb',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}>
                                {t('subscription_status_pending_desc') || 'Aguardando Aprovação do Administrador'}
                            </div>
                        ) : (
                            <button
                                style={isExpired ? styles.buttonPrimary : styles.buttonSecondary}
                                onClick={() => setShowRenewModal(true)}
                            >
                                <CreditCard size={18} />
                                {isExpired ? t('subscription_renew_now') : t('subscription_renew')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <TrendingUp size={24} color="#059669" />
                        <h3 style={styles.cardTitle}>{t('subscription_stats_title')}</h3>
                    </div>

                    <div style={styles.cardBody}>
                        <div style={styles.statItem}>
                            <div style={styles.statLabel}>{t('subscription_stats_total_payments')}</div>
                            <div style={styles.statValue}>{paymentHistory?.length || 0}</div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statLabel}>{t('subscription_stats_total_paid')}</div>
                            <div style={styles.statValue}>
                                {formatCurrency(
                                    paymentHistory?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
                                )}
                            </div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statLabel}>{t('subscription_stats_last_payment')}</div>
                            <div style={styles.statValue}>
                                {paymentHistory?.length > 0
                                    ? formatDate(paymentHistory[paymentHistory.length - 1]?.date)
                                    : 'N/A'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <Calendar size={24} color="#8b5cf6" />
                    <h3 style={styles.cardTitle}>{t('subscription_payment_history')}</h3>
                </div>

                {paymentHistory?.length > 0 ? (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.tableHeader}>{t('subscription_payment_date')}</th>
                                    <th style={styles.tableHeader}>{t('subscription_payment_reference')}</th>
                                    <th style={styles.tableHeader}>{t('subscription_payment_method')}</th>
                                    <th style={styles.tableHeader}>{t('subscription_payment_amount')}</th>
                                    <th style={styles.tableHeader}>{t('subscription_payment_status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map((payment, index) => (
                                    <tr key={index} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{formatDate(payment.date)}</td>
                                        <td style={styles.tableCell}>
                                            <code style={styles.code}>{payment.reference || 'N/A'}</code>
                                        </td>
                                        <td style={styles.tableCell}>
                                            <span style={styles.methodBadge}>
                                                {payment.method?.toUpperCase() || 'MANUAL'}
                                            </span>
                                        </td>
                                        <td style={styles.tableCell}>
                                            <strong>{formatCurrency(payment.amount)}</strong>
                                        </td>
                                        <td style={styles.tableCell}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: payment.status === 'completed' ? '#f0fdf4' : (payment.status === 'pending' ? '#eff6ff' : '#fef2f2'),
                                                color: payment.status === 'completed' ? '#059669' : (payment.status === 'pending' ? '#2563eb' : '#dc2626')
                                            }}>
                                                {payment.status === 'completed'
                                                    ? t('subscription_payment_completed')
                                                    : (payment.status === 'pending' ? 'Pendente' : t('subscription_payment_failed'))
                                                }
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <Calendar size={48} color="#cbd5e1" />
                        <p style={styles.emptyText}>{t('subscription_payment_empty')}</p>
                    </div>
                )}
            </div>

            {/* Renewal Modal */}
            {showRenewModal && (
                <div style={styles.modalOverlay} onClick={() => !renewLoading && setShowRenewModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        {renewSuccess ? (
                            <div style={styles.successContent}>
                                <div style={styles.successIcon}>
                                    <Check size={48} color="#ffffff" />
                                </div>
                                <h3 style={styles.successTitle}>{t('subscription_renew_requested_title') || 'Solicitação Enviada!'}</h3>
                                <p style={styles.successText}>
                                    {t('subscription_renew_requested_desc') || 'A sua renovação foi solicitada. Aguarde a confirmação do administrador.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 style={styles.modalTitle}>{t('subscription_renew')}</h3>
                                <p style={styles.modalText}>
                                    {t('subscription_renew_select_method') || 'Selecione o método de pagamento para renovar sua subscrição.'}
                                </p>

                                {/* Payment Method Selection */}
                                <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div
                                        onClick={() => setSelectedMethod('mpesa')}
                                        style={{
                                            border: `2px solid ${selectedMethod === 'mpesa' ? '#ef4444' : '#e2e8f0'}`,
                                            borderRadius: '12px',
                                            padding: '16px',
                                            cursor: 'pointer',
                                            backgroundColor: selectedMethod === 'mpesa' ? '#fef2f2' : '#ffffff',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <div style={{ fontWeight: '700', color: selectedMethod === 'mpesa' ? '#ef4444' : '#64748b' }}>M-Pesa</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>84/85 xxx xxxx</div>
                                    </div>

                                    <div
                                        onClick={() => setSelectedMethod('visa')}
                                        style={{
                                            border: `2px solid ${selectedMethod === 'visa' ? '#2563eb' : '#e2e8f0'}`,
                                            borderRadius: '12px',
                                            padding: '16px',
                                            cursor: 'pointer',
                                            backgroundColor: selectedMethod === 'visa' ? '#eff6ff' : '#ffffff',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <div style={{ fontWeight: '700', color: selectedMethod === 'visa' ? '#2563eb' : '#64748b' }}>VISA / BCI</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Cartão de Crédito/Débito</div>
                                    </div>
                                </div>

                                <div style={styles.renewalDetails}>
                                    <div style={styles.renewalRow}>
                                        <span>{t('subscription_amount_label')}:</span>
                                        <strong>{formatCurrency(systemPrice)}</strong>
                                    </div>
                                    <div style={styles.renewalRow}>
                                        <span>{t('subscription_period_label')}:</span>
                                        <strong>{t('subscription_period_30_days')}</strong>
                                    </div>
                                </div>

                                <div style={styles.modalActions}>
                                    <button
                                        style={styles.buttonCancel}
                                        onClick={() => setShowRenewModal(false)}
                                        disabled={renewLoading}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        style={styles.buttonConfirm}
                                        onClick={handleRenew}
                                        disabled={renewLoading}
                                    >
                                        {renewLoading ? (
                                            <LoadingSpinner size={18} color="#ffffff" />
                                        ) : (
                                            <>
                                                <Check size={18} />
                                                {t('subscription_confirm_renewal')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    pageContainer: {
        padding: '32px',
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: '#f8fafc'
    },
    header: {
        marginBottom: '32px'
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '8px'
    },
    subtitle: {
        fontSize: '16px',
        color: '#64748b'
    },
    statusCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusCardLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
    },
    statusIconContainer: {
        width: '80px',
        height: '80px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    statusLabel: {
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '4px'
    },
    statusValue: {
        fontSize: '28px',
        fontWeight: '700'
    },
    countdown: {
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#eff6ff',
        borderRadius: '12px',
        border: '2px solid #3b82f6',
        minWidth: '140px'
    },
    countdownNumber: {
        fontSize: '48px',
        fontWeight: '700',
        color: '#3b82f6',
        lineHeight: '1'
    },
    countdownLabel: {
        fontSize: '14px',
        color: '#3b82f6',
        marginTop: '8px',
        fontWeight: '500'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    },
    cardHeader: {
        padding: '24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#0f172a'
    },
    cardBody: {
        padding: '24px'
    },
    cardFooter: {
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
    },
    detailRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid #f1f5f9'
    },
    detailLabel: {
        fontSize: '14px',
        color: '#64748b'
    },
    detailValue: {
        fontSize: '14px',
        color: '#0f172a',
        fontWeight: '500'
    },
    statItem: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        marginBottom: '12px'
    },
    statLabel: {
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '8px'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a'
    },
    tableContainer: {
        overflowX: 'auto'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    tableHeaderRow: {
        backgroundColor: '#f8fafc'
    },
    tableHeader: {
        padding: '16px',
        textAlign: 'left',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    tableRow: {
        borderBottom: '1px solid #e2e8f0'
    },
    tableCell: {
        padding: '16px',
        fontSize: '14px',
        color: '#0f172a'
    },
    code: {
        backgroundColor: '#f1f5f9',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
    },
    methodBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#eff6ff',
        color: '#3b82f6',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
    },
    statusBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
    },
    emptyState: {
        padding: '64px 24px',
        textAlign: 'center'
    },
    emptyText: {
        marginTop: '16px',
        color: '#94a3b8',
        fontSize: '14px'
    },
    buttonPrimary: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    buttonSecondary: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
    },
    modal: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
    },
    modalTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '8px'
    },
    modalText: {
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '24px'
    },
    renewalDetails: {
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
    },
    renewalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        fontSize: '14px'
    },
    modalActions: {
        display: 'flex',
        gap: '12px'
    },
    buttonCancel: {
        flex: 1,
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    buttonConfirm: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    successContent: {
        textAlign: 'center',
        padding: '20px'
    },
    successIcon: {
        width: '80px',
        height: '80px',
        backgroundColor: '#059669',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
    },
    successTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '8px'
    },
    successText: {
        fontSize: '14px',
        color: '#64748b'
    }
};
