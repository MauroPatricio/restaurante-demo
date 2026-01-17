import { useSubscription } from '../contexts/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import { Lock, CreditCard, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * PremiumFeatureGate - Wraps features that require an active/non-expiring subscription
 * @param {children} param0 - The feature content to protect
 * @param {string} featureName - Optional name of the feature for the warning message
 * @param {boolean} blurOnly - If true, blurs the content instead of completely hiding it
 */
const PremiumFeatureGate = ({ children, featureName, blurOnly = false }) => {
    const { isBlocked, isExpiring, subscription } = useSubscription();
    const { t } = useTranslation();

    // If fully blocked (expired), usually DashboardLayout handles it, but as a backup:
    if (isBlocked) {
        return (
            <div className="premium-gate-blocked">
                <style>{`
                    .premium-gate-blocked {
                        padding: 40px;
                        text-align: center;
                        background: #f8fafc;
                        border: 2px dashed #e2e8f0;
                        border-radius: 16px;
                        margin: 20px;
                    }
                `}</style>
                <Lock size={48} className="text-red-500 mb-4 mx-auto" />
                <h3 className="text-xl font-bold mb-2">{t('blocked_expired_title')}</h3>
                <p className="text-gray-600 mb-6">{t('blocked_expired_owner_desc')}</p>
                <Link to="/dashboard/subscription" className="btn-primary inline-flex items-center gap-2">
                    <CreditCard size={18} />
                    {t('subscription_renew_button')}
                </Link>
            </div>
        );
    }

    // If expiring, we show the content but with a prominent overlay/banner if requested,
    // or we can use the blur effect to encourage renewal.
    if (isExpiring) {
        return (
            <div className="relative overflow-hidden rounded-xl">
                <style>{`
                    .expiring-notice-overlay {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 70%, transparent 100%);
                        padding: 60px 24px 24px;
                        text-align: center;
                        z-index: 10;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .premium-content-blur {
                        filter: blur(4px);
                        pointer-events: none;
                        user-select: none;
                    }
                `}</style>

                <div className={blurOnly ? "premium-content-blur" : ""}>
                    {children}
                </div>

                <div className="expiring-notice-overlay">
                    <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-xl max-w-lg w-full animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center gap-3 mb-3 justify-center">
                            <Lock size={20} className="text-orange-600" />
                            <h4 className="text-lg font-bold text-gray-900">
                                {t('subscription_expiring')}
                            </h4>
                        </div>
                        <p className="text-gray-600 mb-6">
                            {t('subscription_expired_message_premium', {
                                feature: featureName || t('premium_feature', 'esta funcionalidade premium'),
                                defaultValue: `A sua subscrição está a expirar. Renove agora para manter acesso total a ${featureName || 'esta funcionalidade'}.`
                            })}
                        </p>
                        <Link
                            to="/dashboard/subscription"
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-orange-200 flex items-center gap-2 mx-auto w-fit"
                        >
                            <CreditCard size={18} />
                            {t('subscription_renew_now')}
                            <ChevronRight size={18} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default PremiumFeatureGate;
