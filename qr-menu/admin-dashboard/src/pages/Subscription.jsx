import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionAPI } from '../services/api';
import { CreditCard, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Subscription() {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.restaurant) {
            fetchSubscription();
        }
    }, [user]);

    const fetchSubscription = async () => {
        try {
            const response = await subscriptionAPI.get(user.restaurant._id || user.restaurant);
            setSubscription(response.data.subscription);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading subscription...</div>;
    }

    const statusColor = {
        trial: 'blue',
        active: 'green',
        suspended: 'red',
        cancelled: 'gray'
    };

    return (
        <div className="subscription-page">
            <div className="page-header">
                <h2>Subscription Management</h2>
                <p>Manage your subscription and billing</p>
            </div>

            <div className="subscription-card">
                <div className="subscription-header">
                    <div>
                        <h3>Current Plan</h3>
                        <p className="subscription-amount">10,000 MT / month</p>
                    </div>
                    <span className={`status-badge ${statusColor[subscription?.status]}`}>
                        {subscription?.status}
                    </span>
                </div>

                <div className="subscription-details">
                    <div className="detail-row">
                        <div className="detail-label">
                            <Calendar size={18} />
                            <span>Current Period</span>
                        </div>
                        <div className="detail-value">
                            {subscription?.currentPeriodStart && format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')}
                            {' - '}
                            {subscription?.currentPeriodEnd && format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                        </div>
                    </div>

                    <div className="detail-row">
                        <div className="detail-label">
                            {subscription?.isValid ? <CheckCircle size={18} className="text-green" /> : <XCircle size={18} className="text-red" />}
                            <span>Status</span>
                        </div>
                        <div className="detail-value">
                            {subscription?.isValid ? 'Active and Valid' : 'Suspended or Expired'}
                        </div>
                    </div>

                    {subscription?.isTrial && (
                        <div className="trial-notice">
                            <p>🎉 You're currently on a free trial period.</p>
                            <p>Your first month is free! Payment will be required after {subscription?.currentPeriodEnd && format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}</p>
                        </div>
                    )}
                </div>

                {!subscription?.isValid && (
                    <div className="subscription-warning">
                        <h4>⚠️ Subscription Suspended</h4>
                        <p>Your subscription has been suspended due to non-payment. Please renew to continue using the service.</p>
                        <button className="btn-primary">
                            <CreditCard size={18} />
                            Renew Subscription
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
