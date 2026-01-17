import { useTranslation } from 'react-i18next';
import { AlertCircle, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionRenewalModal = ({ subscription, onRenew, onCancel }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleRenewClick = () => {
        if (onRenew) {
            onRenew();
        } else {
            // Default: navigate to subscription/payment page
            navigate('/dashboard/subscription');
        }
    };

    const handleCancelClick = () => {
        if (onCancel) {
            onCancel();
        }
        // For now, cancel just closes (or does nothing since modal is mandatory)
    };

    // Format expiration date
    const expirationDate = subscription?.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : 'N/A';

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        animation: 'fadeIn 0.3s ease-out'
    };

    const modalStyle = {
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        animation: 'scaleIn 0.3s ease-out',
        border: '3px solid #dc2626'
    };

    const iconContainerStyle = {
        width: '80px',
        height: '80px',
        margin: '0 auto 24px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'pulse 2s infinite'
    };

    const titleStyle = {
        fontSize: '2rem',
        fontWeight: '800',
        color: '#dc2626',
        marginBottom: '16px',
        textTransform: 'uppercase',
        letterSpacing: '-0.5px'
    };

    const messageStyle = {
        fontSize: '1.05rem',
        color: '#64748b',
        marginBottom: '32px',
        lineHeight: '1.7'
    };

    const detailsBoxStyle = {
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        border: '1px solid #e2e8f0'
    };

    const detailRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0'
    };

    const detailLabelStyle = {
        fontSize: '0.95rem',
        color: '#64748b',
        fontWeight: '500'
    };

    const detailValueStyle = {
        fontSize: '1.05rem',
        color: '#1e293b',
        fontWeight: '700'
    };

    const buttonsContainerStyle = {
        display: 'flex',
        gap: '16px',
        marginTop: '32px'
    };

    const cancelButtonStyle = {
        flex: 1,
        padding: '16px 24px',
        background: 'transparent',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
            background: '#f8fafc',
            borderColor: '#cbd5e1'
        }
    };

    const renewButtonStyle = {
        flex: 2,
        padding: '16px 24px',
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
        animation: 'pulse-glow 2s infinite'
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Alert Icon */}
                <div style={iconContainerStyle}>
                    <AlertCircle size={40} color="#dc2626" strokeWidth={2.5} />
                </div>

                {/* Title */}
                <h1 style={titleStyle}>⚠️ {t('subscription_expired_title')}</h1>

                {/* Message */}
                <p style={messageStyle}>
                    {t('subscription_expired_message')}
                </p>

                {/* Subscription Details */}
                <div style={detailsBoxStyle}>
                    <div style={{ ...detailRowStyle, borderBottom: '1px solid #e2e8f0' }}>
                        <span style={detailLabelStyle}>{t('plan_label', 'Plano')}:</span>
                        <span style={detailValueStyle}>
                            {subscription?.plan || 'Standard'}
                        </span>
                    </div>
                    <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                        <span style={detailLabelStyle}>{t('amount_label', 'Valor Mensal')}:</span>
                        <span style={{ ...detailValueStyle, color: '#dc2626' }}>
                            {subscription?.price || '8,000'} MT
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={buttonsContainerStyle}>
                    <button
                        style={cancelButtonStyle}
                        onClick={handleCancelClick}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#f8fafc';
                            e.target.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.borderColor = '#e2e8f0';
                        }}
                    >
                        {t('close_button')}
                    </button>
                    <button
                        style={renewButtonStyle}
                        onClick={handleRenewClick}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'none';
                            e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
                        }}
                    >
                        <CreditCard size={20} />
                        {t('subscription_renew_button')}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                @keyframes pulse-glow {
                    0%, 100% {
                        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
                    }
                    50% {
                        box-shadow: 0 4px 20px rgba(220, 38, 38, 0.6);
                    }
                }
            `}</style>
        </div>
    );
};

export default SubscriptionRenewalModal;
