import { useState, useEffect } from 'react';
import { AlertCircle, X, ChevronDown, ChevronUp, Calendar, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SubscriptionAlert({ subscription }) {
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        if (!subscription) return;

        const now = new Date();
        const endDate = new Date(subscription.currentPeriodEnd);
        const diffTime = endDate - now;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isTrial = subscription.status === 'trial' || subscription.isTrial; // Check both just in case

        let shouldShow = false;

        if (subscription.status === 'expired') {
            shouldShow = true;
        } else if (isTrial) {
            shouldShow = true; // Always show in trial
        } else if (daysRemaining <= 7) {
            shouldShow = true; // Show if 7 days or less
        }

        // Check if already dismissed in this session? User said "Sempre que aceder", implies session.
        // But for now, let's just show it on mount. If it's annoying we can add sessionStorage check.
        setIsVisible(shouldShow);

    }, [subscription]);

    if (!subscription || !isVisible) return null;

    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    const diffTime = endDate - now;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Config based on state
    const getAlertConfig = () => {
        if (subscription.status === 'expired' /* || daysRemaining <= 0 */) { // Commented out days check to avoid blocking active users who just expired today?? Rely on status.
            return {
                title: t('subscription_expired'),
                message: t('subscription_expired_message'),
                type: 'critical',
                icon: AlertCircle,
                colors: {
                    headerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    primary: '#dc2626',
                    shadow: 'rgba(220, 38, 38, 0.4)'
                }
            };
        } else if (subscription.status === 'trial') {
            return {
                title: t('trial_period_active', 'Período Experimental Ativo'),
                message: t('trial_days_remaining', { days: daysRemaining, defaultValue: `O seu período experimental termina em ${daysRemaining} dias.` }),
                type: 'info',
                icon: Calendar,
                colors: {
                    headerGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    primary: '#2563eb',
                    shadow: 'rgba(37, 99, 235, 0.4)'
                }
            };
        } else {
            // Active but expiring
            return {
                title: t('subscription_expiring'),
                message: t('subscription_renew_warning', { days: daysRemaining, defaultValue: `A sua subscrição termina em ${daysRemaining} dias. Renove para evitar interrupções.` }),
                type: 'warning',
                icon: AlertCircle,
                colors: {
                    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    primary: '#d97706',
                    shadow: 'rgba(217, 119, 6, 0.4)'
                }
            };
        }
    };

    const config = getAlertConfig();
    const Icon = config.icon;

    const handleRenew = () => {
        navigate('/dashboard/subscription'); // Or specific link
        setIsVisible(false); // Close on navigation
    };

    // Styles configuration
    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            animation: 'fadeIn 0.3s ease-out'
        },
        container: {
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid rgba(255,255,255,0.5)'
        },
        header: {
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            background: config.colors.headerGradient
        },
        iconWrapper: {
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            backdropFilter: 'blur(4px)'
        },
        title: {
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: '700',
            flex: 1,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
        },
        closeButton: {
            color: 'rgba(255,255,255,0.8)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        body: {
            padding: '24px'
        },
        message: {
            color: '#334155',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '20px'
        },
        detailsBox: {
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontSize: '14px'
        },
        footer: {
            padding: '20px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
        },
        buttonSecondary: {
            padding: '12px 20px',
            backgroundColor: '#ffffff',
            color: '#475569',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        },
        buttonPrimary: {
            padding: '12px 24px',
            backgroundColor: config.colors.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 4px 6px -1px ${config.colors.shadow}, 0 2px 4px -1px ${config.colors.shadow}`,
            transition: 'transform 0.1s, box-shadow 0.2s'
        }
    };

    return (
        <div style={styles.overlay}>
            <style>
                {`
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px) scale(0.95); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}
            </style>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.iconWrapper}>
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <h3 style={styles.title}>
                        {config.title}
                    </h3>
                    <button
                        onClick={() => setIsVisible(false)}
                        style={styles.closeButton}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={styles.body}>
                    <p style={styles.message}>
                        {config.message}
                    </p>

                    {/* Countdown / Details */}
                    <div style={styles.detailsBox}>
                        <Calendar size={18} color="#64748b" />
                        <span>Termina em: <strong style={{ color: '#0f172a' }}>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong></span>
                    </div>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <button
                        onClick={() => setIsVisible(false)}
                        style={styles.buttonSecondary}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                    >
                        {t('close', 'Fechar')}
                    </button>
                    <button
                        onClick={handleRenew}
                        style={styles.buttonPrimary}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = `0 6px 8px -1px ${config.colors.shadow}, 0 4px 6px -1px ${config.colors.shadow}`;
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = `0 4px 6px -1px ${config.colors.shadow}, 0 2px 4px -1px ${config.colors.shadow}`;
                        }}
                    >
                        <CreditCard size={18} />
                        {t('renew_subscription', 'Renovar / Ver Planos')}
                    </button>
                </div>
            </div>
        </div>
    );
}

