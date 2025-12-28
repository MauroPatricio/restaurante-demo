import { AlertCircle, CreditCard, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import './SubscriptionBlocker.css';

const STATUS_CONFIG = {
    suspended: {
        title: 'Conta Suspensa',
        description: 'Sua subscrição foi suspensa. Renove para continuar usando o sistema.',
        icon: '⏸️',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        borderColor: '#f59e0b'
    },
    cancelled: {
        title: 'Conta Cancelada',
        description: 'Sua subscrição foi cancelada. Renove para reativar o acesso.',
        icon: '❌',
        color: '#ef4444',
        bgColor: '#fee2e2',
        borderColor: '#ef4444'
    },
    expired: {
        title: 'Subscrição Expirada',
        description: 'Sua subscrição expirou. Renove para continuar usando o sistema.',
        icon: '⏰',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        borderColor: '#9ca3af'
    }
};

export default function SubscriptionBlocker({ status, subscription }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.expired;

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="subscription-blocker-page">
            <div
                className="blocker-card"
                style={{
                    borderTop: `6px solid ${config.borderColor}`,
                    backgroundColor: 'white'
                }}
            >
                {/* Icon */}
                <div
                    className="blocker-icon"
                    style={{ backgroundColor: config.bgColor }}
                >
                    <span style={{ fontSize: '4rem' }}>{config.icon}</span>
                </div>

                {/* Title */}
                <h1
                    className="blocker-title"
                    style={{ color: config.color }}
                >
                    {config.title}
                </h1>

                {/* Description */}
                <p className="blocker-description">
                    {config.description}
                </p>

                {/* Status Info */}
                <div className="blocker-info">
                    <div className="info-row">
                        <AlertCircle size={20} style={{ color: config.color }} />
                        <div>
                            <strong>Estado:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}
                        </div>
                    </div>

                    {subscription?.currentPeriodEnd && (
                        <div className="info-row">
                            <Calendar size={20} style={{ color: config.color }} />
                            <div>
                                <strong>Data de Expiração:</strong> {formatDate(subscription.currentPeriodEnd)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Warning Message */}
                <div
                    className="blocker-warning"
                    style={{
                        backgroundColor: config.bgColor,
                        borderLeft: `4px solid ${config.color}`
                    }}
                >
                    <AlertCircle size={20} style={{ color: config.color }} />
                    <p>
                        <strong>Acesso Bloqueado:</strong> Todas as funcionalidades do sistema estão bloqueadas.
                        Apenas a renovação de subscrição está disponível.
                    </p>
                </div>

                {/* CTA Button */}
                <Link to="/dashboard/subscription" className="blocker-cta-link">
                    <button
                        className="blocker-cta-button"
                        style={{ backgroundColor: config.color }}
                    >
                        <CreditCard size={20} />
                        Renovar Assinatura Agora
                    </button>
                </Link>

                {/* Help Text */}
                <p className="blocker-help-text">
                    Precisa de ajuda? Entre em contato com o suporte.
                </p>
            </div>
        </div>
    );
}
