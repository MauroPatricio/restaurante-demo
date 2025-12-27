import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const SubscriptionBlockedScreen = ({ userType = 'staff', subscription }) => {
    const { t } = useTranslation();

    const isInGrace = subscription?.isInGrace;

    const getConfig = () => {
        if (isInGrace) {
            return {
                title: t('blocked_grace_title'),
                description: t('blocked_grace_desc'),
                showButton: true
            };
        } else if (userType === 'staff') {
            return {
                title: t('blocked_expired_title'),
                description: t('blocked_expired_staff_desc'),
                showButton: false
            };
        } else {
            return {
                title: t('blocked_expired_title'),
                description: t('blocked_expired_owner_desc'),
                showButton: true
            };
        }
    };

    const config = getConfig();

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
    };

    const cardStyle = {
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '24px',
        padding: '48px',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
    };

    const iconContainerStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        background: isInGrace ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        marginBottom: '24px'
    };

    const titleStyle = {
        fontSize: '32px',
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '16px',
        letterSpacing: '-0.02em'
    };

    const descriptionStyle = {
        fontSize: '18px',
        color: '#cbd5e1',
        marginBottom: '32px',
        lineHeight: '1.6'
    };

    const detailsStyle = {
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '32px',
        textAlign: 'left'
    };

    const detailRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '14px'
    };

    const labelStyle = {
        color: '#94a3b8',
        fontWeight: '500'
    };

    const valueStyle = {
        color: '#ffffff',
        fontWeight: '600'
    };

    const buttonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 32px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)'
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const getDaysExpired = () => {
        if (!subscription?.endDate && !subscription?.currentPeriodEnd) return 0;
        const now = new Date();
        const end = new Date(subscription.endDate || subscription.currentPeriodEnd);
        const diffTime = now - end;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    return (
        <div style={overlayStyle}>
            <div style={cardStyle}>
                <div style={iconContainerStyle}>
                    {isInGrace ? (
                        <AlertCircle size={48} color="#fbbf24" />
                    ) : (
                        <AlertTriangle size={48} color="#ef4444" />
                    )}
                </div>

                <h2 style={titleStyle}>{config.title}</h2>
                <p style={descriptionStyle}>{config.description}</p>

                {subscription && (
                    <div style={detailsStyle}>
                        <div style={detailRowStyle}>
                            <span style={labelStyle}>{t('blocked_status_label')}:</span>
                            <span style={valueStyle}>{subscription.status?.toUpperCase() || 'EXPIRED'}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={labelStyle}>{t('blocked_expiry_date')}:</span>
                            <span style={valueStyle}>{formatDate(subscription.endDate || subscription.currentPeriodEnd)}</span>
                        </div>
                        {getDaysExpired() > 0 && (
                            <div style={detailRowStyle}>
                                <span style={labelStyle}>{t('blocked_days_expired')}:</span>
                                <span style={{ ...valueStyle, color: '#ef4444' }}>{getDaysExpired()} {t('days_label') || 'dias'}</span>
                            </div>
                        )}
                        {isInGrace && subscription.graceEndDate && (
                            <div style={detailRowStyle}>
                                <span style={labelStyle}>{t('blocked_grace_until')}:</span>
                                <span style={valueStyle}>{formatDate(subscription.graceEndDate)}</span>
                            </div>
                        )}
                        <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                            <span style={labelStyle}>{t('blocked_renewal_amount')}:</span>
                            <span style={valueStyle}>{subscription.amount?.toLocaleString()} {subscription.currency || 'MT'}</span>
                        </div>
                    </div>
                )}

                {config.showButton && (
                    <Link to="/dashboard/subscription" style={buttonStyle}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                        <CreditCard size={20} />
                        {t('subscription_renew')}
                    </Link>
                )}

                {!config.showButton && (
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '20px' }}>
                        {t('blocked_contact_manager')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default SubscriptionBlockedScreen;
