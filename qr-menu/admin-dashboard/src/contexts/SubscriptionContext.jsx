import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within SubscriptionProvider');
    }
    return context;
};

export const SubscriptionProvider = ({ children }) => {
    const [subscription, setSubscription] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [requiresRenewal, setRequiresRenewal] = useState(false);
    const [isExpiring, setIsExpiring] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const checkSubscription = async () => {


        // Check if user has selected a specific restaurant
        const restaurantId = user?.restaurant?.id || user?.restaurant?._id || (typeof user?.restaurant === 'string' ? user.restaurant : null);
        const hasSelectedRestaurant = !!restaurantId;
        // Check if user has multiple restaurants in their account
        const hasMultipleRestaurants = user?.restaurants && user.restaurants.length > 1;

        if (!hasSelectedRestaurant && !hasMultipleRestaurants) {
            setLoading(false);
            return;
        }

        try {
            let data;

            // PRIORITY: If user has selected a specific restaurant, fetch that restaurant's subscription
            // This happens after restaurant selection, even if they own multiple restaurants
            if (hasSelectedRestaurant) {
                // Optimization: If user object already has the full subscription populated, use it
                if (user.subscription && typeof user.subscription === 'object' && user.subscription.currentPeriodEnd) {
                    console.log('[SubscriptionContext] Using subscription data from AuthContext');
                    data = { subscription: user.subscription };
                } else {
                    console.log('[SubscriptionContext] Fetching subscription for selected restaurant ID:', restaurantId);
                    const response = await api.get(`/subscriptions/${restaurantId}`);
                    data = response.data;
                }

                const subscriptionData = data.subscription || data;
                console.log('[SubscriptionContext] Fetched subscription:', subscriptionData);

                setSubscription(subscriptionData);

                // STRICT BLOCKING LOGIC
                const status = subscriptionData.status;
                console.log('[SubscriptionContext] Subscription status:', status);

                const now = new Date();
                const endDate = new Date(subscriptionData.currentPeriodEnd);

                const isTrial = status === 'trial';
                const isActive = status === 'active';
                const isExpired = status === 'expired';
                const isTrialExpired = isTrial && endDate < now;

                const isAllowed = isActive || (isTrial && !isTrialExpired);
                setIsBlocked(!isAllowed);
                setRequiresRenewal(isExpired || isTrialExpired);

                // Calculate isExpiring (<= 7 days and not already blocked)
                const diffTime = endDate - now;
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setIsExpiring(isAllowed && daysRemaining <= 7 && daysRemaining >= 0);
            }
            // FALLBACK: For multi-restaurant users who haven't selected a restaurant yet
            // (e.g., on restaurant selection page)
            else if (hasMultipleRestaurants) {
                console.log('[SubscriptionContext] Fetching global status for multi-restaurant user');
                const response = await api.get(`/subscriptions/global-status`);
                data = response.data;

                // Store global subscription data
                setSubscription({
                    ...data.criticalSubscription,
                    globalStatus: data.globalStatus,
                    isSingleRestaurant: data.isSingleRestaurant,
                    totalRestaurants: data.totalRestaurants,
                    restaurants: data.restaurants
                });

                // Use global status for blocking decision
                const status = data.globalStatus;
                const now = new Date();
                const endDate = new Date(data.criticalSubscription.currentPeriodEnd);

                const isTrial = status === 'trial';
                const isActive = status === 'active';
                const isExpired = status === 'expired';
                const isTrialExpired = isTrial && endDate < now;

                const isAllowed = isActive || (isTrial && !isTrialExpired);
                setIsBlocked(!isAllowed);
                setRequiresRenewal(isExpired || isTrialExpired);

                // Calculate isExpiring (<= 7 days and not already blocked)
                const diffTime = endDate - now;
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setIsExpiring(isAllowed && daysRemaining <= 7 && daysRemaining >= 0);
            }
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
            // If we can't fetch, assume not blocked to avoid breaking the app
            setIsBlocked(false);
            setRequiresRenewal(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleUpdate = () => {
            console.log('[SubscriptionContext] Subscription update event received');
            refreshSubscription();
        };

        window.addEventListener('subscription-updated', handleUpdate);

        if (user) {
            checkSubscription();

            // Refresh subscription status every minute
            const interval = setInterval(checkSubscription, 60000);

            return () => {
                clearInterval(interval);
                window.removeEventListener('subscription-updated', handleUpdate);
            };
        } else {
            setLoading(false);
            setSubscription(null);
            setIsBlocked(false);
            setRequiresRenewal(false);
            setIsExpiring(false);
        }

        return () => window.removeEventListener('subscription-updated', handleUpdate);
    }, [user]);

    const refreshSubscription = async () => {
        await checkSubscription();
    };

    const value = {
        subscription,
        isBlocked,
        requiresRenewal,
        isExpiring,
        loading,
        refreshSubscription
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};
