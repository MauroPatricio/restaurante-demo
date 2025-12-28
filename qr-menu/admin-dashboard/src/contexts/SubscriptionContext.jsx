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
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const checkSubscription = async () => {
        // Skip for system admin
        if (user?.role?.isSystem) {
            setIsBlocked(false);
            setLoading(false);
            return;
        }

        if (!user?.restaurant?.id && !user?.restaurant?._id) {
            setLoading(false);
            return;
        }

        try {
            const restaurantId = user.restaurant.id || user.restaurant._id;
            const { data } = await api.get(`/subscriptions/${restaurantId}`);

            setSubscription(data.subscription || data);

            // Check if blocked based on subscription status
            const blockedStatuses = ['suspended', 'cancelled', 'expired'];
            const blocked = blockedStatuses.includes(data.subscription?.status || data.status);
            setIsBlocked(blocked);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
            // If we can't fetch, assume not blocked to avoid breaking the app
            setIsBlocked(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            checkSubscription();

            // Refresh subscription status every minute
            const interval = setInterval(checkSubscription, 60000);

            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [user]);

    const refreshSubscription = async () => {
        await checkSubscription();
    };

    const value = {
        subscription,
        isBlocked,
        loading,
        refreshSubscription
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};
