import { useSubscription } from '../contexts/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import { Lock, CreditCard, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SubscriptionBlockedScreen from './SubscriptionBlockedScreen';
import { useAuth } from '../contexts/AuthContext';

/**
 * PremiumFeatureGate - Wraps features that require an active/non-expiring subscription
 * @param {children} param0 - The feature content to protect
 * @param {string} featureName - Optional name of the feature for the warning message
 * @param {boolean} blurOnly - If true, blurs the content instead of completely hiding it
 */
const PremiumFeatureGate = ({ children, featureName, blurOnly = false }) => {
    const { isBlocked, isExpiring, subscription } = useSubscription();
    const { user } = useAuth();
    const { t } = useTranslation();
    const userType = user?.role === 'owner' || user?.role === 'manager' ? 'owner' : 'staff';

    // If fully blocked (expired), usually DashboardLayout handles it, but as a backup:
    if (isBlocked) {
        return <SubscriptionBlockedScreen userType={userType} subscription={subscription} />;
    }

    // If expiring, we now FULLY BLOCK the content as requested
    if (isExpiring) {
        return <SubscriptionBlockedScreen userType={userType} subscription={subscription} />;
    }

    return <>{children}</>;
};

export default PremiumFeatureGate;
