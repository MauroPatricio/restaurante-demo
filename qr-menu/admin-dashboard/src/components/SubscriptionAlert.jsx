import { useState, useEffect } from 'react';
import { AlertCircle, X, Calendar } from 'lucide-react';
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

        // Mostrar o alerta sempre que a página for recarregada (refresh) para garantir a visibilidade
        if (subscription.status === 'expired') {
            shouldShow = true; // Mostrar sempre se estiver expirado
        } else if (isTrial) {
            shouldShow = true; // Mostrar trial
        } else if (daysRemaining <= 7) {
            shouldShow = true; // Mostrar a expirar
        }

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

    const handleClose = () => {
        setIsVisible(false);
    };

    // Styles configuration - Banner style
    const styles = {
        banner: {
            position: 'relative',
            marginBottom: '20px',
            borderRadius: '8px',
            background: config.colors.headerGradient,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            animation: 'slideDown 0.3s ease-out'
        },
        iconWrapper: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            backdropFilter: 'blur(4px)',
            flexShrink: 0
        },
        content: {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 0
        },
        message: {
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.4'
        },
        actionButton: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            flexShrink: 0
        },
        closeButton: {
            color: '#ffffff',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 10px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: 0.9,
            fontSize: '16px',
            fontWeight: 'bold',
            minWidth: '36px',
            minHeight: '36px'
        }
    };

    return (
        <div style={{ padding: '20px 2rem 0 2rem', background: 'var(--background)', zIndex: 50, position: 'relative' }}>
            <style>
                {`
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
            <div style={styles.banner}>
                <div style={styles.iconWrapper}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <div style={styles.content}>
                    <div style={styles.message}>
                        {config.message}
                    </div>
                </div>
                <button
                    onClick={handleRenew}
                    style={styles.actionButton}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                >
                    {t('view_details', 'Ver Detalhes')}
                </button>
                {config.type !== 'critical' && (
                    <button
                        onClick={handleClose}
                        style={styles.closeButton}
                        title={t('close', 'Fechar')}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
