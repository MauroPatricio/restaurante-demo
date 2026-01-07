import { useState } from 'react';
import { AlertCircle, X, ChevronDown, ChevronUp, Calendar, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SubscriptionAlert({ subscription }) {
    const [isMinimized, setIsMinimized] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (!subscription) return null;

    // Calculate days until expiry
    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    const diffTime = endDate - now;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Don't show if more than 14 days remaining
    if (daysRemaining > 14 && subscription.status !== 'expired') {
        return null;
    }

    // Determine urgency level and styling
    const getAlertConfig = () => {
        if (subscription.status === 'expired' || daysRemaining <= 0) {
            return {
                bgColor: 'bg-red-50',
                borderColor: 'border-red-500',
                textColor: 'text-red-800',
                iconColor: 'text-red-600',
                buttonBg: 'bg-red-600 hover:bg-red-700',
                level: 'critical',
                icon: AlertCircle
            };
        } else if (daysRemaining <= 2) {
            return {
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-500',
                textColor: 'text-orange-800',
                iconColor: 'text-orange-600',
                buttonBg: 'bg-orange-600 hover:bg-orange-700',
                level: 'urgent',
                icon: AlertCircle
            };
        } else if (daysRemaining <= 7) {
            return {
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-500',
                textColor: 'text-yellow-800',
                iconColor: 'text-yellow-600',
                buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
                level: 'warning',
                icon: AlertCircle
            };
        } else {
            return {
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-500',
                textColor: 'text-blue-800',
                iconColor: 'text-blue-600',
                buttonBg: 'bg-blue-600 hover:bg-blue-700',
                level: 'info',
                icon: Calendar
            };
        }
    };

    const config = getAlertConfig();
    const Icon = config.icon;

    // Format date
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Get message based on days remaining
    const getMessage = () => {
        if (subscription.status === 'expired' || daysRemaining <= 0) {
            return t('subscription_expired_message');
        } else if (daysRemaining === 1) {
            return t('subscription_expires_tomorrow', { date: formatDate(endDate) });
        } else if (daysRemaining <= 2) {
            return t('subscription_expires_urgent', { days: daysRemaining, date: formatDate(endDate) });
        } else if (daysRemaining <= 7) {
            return t('subscription_expires_soon', { days: daysRemaining, date: formatDate(endDate) });
        } else {
            return t('subscription_expires_info', { days: daysRemaining, date: formatDate(endDate) });
        }
    };

    const handleRenew = () => {
        navigate('/dashboard/subscription');
    };

    if (isMinimized) {
        return (
            <div className={`${config.bgColor} ${config.borderColor} border-l-4 p-3 mb-4 rounded-lg shadow-sm`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                        <span className={`text-sm font-medium ${config.textColor}`}>
                            {subscription.status === 'expired' ? t('subscription_expired') : `${daysRemaining} ${t('days_remaining')}`}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsMinimized(false)}
                        className={`p-1 rounded hover:bg-white/50 transition-colors ${config.textColor}`}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`${config.bgColor} ${config.borderColor} border-l-4 p-4 mb-4 rounded-lg shadow-md`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-6 w-6 ${config.iconColor} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-lg font-semibold ${config.textColor}`}>
                                {subscription.status === 'expired' ? t('subscription_expired') : t('subscription_expiring')}
                            </h3>
                            {subscription.status === 'trial' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-white/50 rounded">
                                    Trial
                                </span>
                            )}
                        </div>
                        <p className={`text-sm ${config.textColor} mb-3`}>
                            {getMessage()}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                onClick={handleRenew}
                                className={`${config.buttonBg} text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors`}
                            >
                                <CreditCard className="h-4 w-4" />
                                {t('renew_subscription')}
                            </button>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className={`${config.textColor} hover:underline text-sm`}
                            >
                                {t('minimize')}
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsMinimized(true)}
                    className={`p-1 rounded hover:bg-white/50 transition-colors ${config.textColor} flex-shrink-0`}
                >
                    <ChevronUp className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
