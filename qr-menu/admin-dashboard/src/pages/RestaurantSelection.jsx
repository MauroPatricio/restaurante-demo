import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../services/api';
import api from '../services/api';
import { LogOut, Building2, ChevronRight, PlusCircle, ArrowRight, Power } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStatusLabel, getStatusBadgeStyle } from '../utils/subscriptionStatusHelper';
import { useTranslation } from 'react-i18next';

import './RestaurantSelection.css';

const RestaurantSelection = () => {
    const { user, selectRestaurant } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [restaurants, setRestaurants] = useState([]);
    const [subscriptions, setSubscriptions] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [togglingId, setTogglingId] = useState(null);

    const isOwner = user?.role?.name === 'Owner' || user?.role?.isSystem;

    useEffect(() => {
        const loadData = async () => {
            if (location.state?.restaurants) {
                setRestaurants(location.state.restaurants);
                await fetchSubscriptions(location.state.restaurants);
            } else if (user?.restaurants && Array.isArray(user.restaurants)) {
                setRestaurants(user.restaurants);
                await fetchSubscriptions(user.restaurants);
            } else if (!user) {
                navigate('/login');
            }
        };
        loadData();
    }, [user, location.state]);

    const fetchSubscriptions = async (restaurantList) => {
        try {
            const subscriptionData = {};

            // Bulk fetch all subscription statuses for the user
            // This is MUCH faster than individual calls
            const { data } = await api.get('/subscriptions/global-status');

            if (data.restaurants && Array.isArray(data.restaurants)) {
                data.restaurants.forEach(sub => {
                    subscriptionData[sub.restaurantId] = {
                        status: sub.status,
                        currentPeriodEnd: sub.currentPeriodEnd
                    };
                });
            } else if (data.subscription) {
                // Single restaurant case
                const rid = data.restaurant?._id || data.restaurant?.id;
                if (rid) {
                    subscriptionData[rid] = data.subscription;
                }
            }

            setSubscriptions(subscriptionData);
        } catch (err) {
            console.error('Failed to fetch subscriptions in bulk:', err);
            // Fallback: If bulk fails, we could do individual ones but better to show error or empty
        }
    };

    const handleSelectRestaurant = async (restaurantId) => {
        setLoading(true);
        setError('');
        try {
            await selectRestaurant(restaurantId);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(t('failed_select_restaurant'));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (e, restaurantId) => {
        e.stopPropagation(); // Prevent restaurant selection
        setTogglingId(restaurantId);
        try {
            const { data } = await restaurantAPI.toggleActive(restaurantId);

            // Update local state
            setRestaurants(prev => prev.map(r =>
                (r.id || r._id) === restaurantId
                    ? { ...r, active: data.active }
                    : r
            ));
        } catch (err) {
            console.error('Failed to toggle restaurant status:', err);
            alert(t('failed_toggle_status'));
        } finally {
            setTogglingId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <div className="selection-layout animate-fade">
            {/* LEFT SIDE: CONTENT */}
            <div className="selection-left">
                <div className="selection-card animate-slide-up">
                    <div className="selection-header">
                        <div className="icon-badge">
                            <Building2 size={24} />
                        </div>
                        <h1>{t('welcome_back')}</h1>
                        <p>{t('select_establishment')}</p>
                    </div>

                    {error && (
                        <div className="error-message animate-fade">
                            {error}
                        </div>
                    )}

                    <div className="action-list">
                        {/* Global Dashboard Button (for Owners) */}
                        {isOwner && (
                            <button
                                onClick={() => navigate('/owner-dashboard')}
                                className="global-dash-btn"
                            >
                                <div className="btn-content">
                                    <Building2 size={20} className="icon-primary" />
                                    <span>{t('global_owner_dashboard')}</span>
                                </div>
                                <ArrowRight size={18} className="arrow-icon" />
                            </button>
                        )}

                        {/* Separator */}
                        <div className="separator">
                            <span>{t('your_establishments')}</span>
                        </div>

                        {/* Restaurants List */}
                        <div className="restaurants-list custom-scrollbar">
                            {restaurants.map((restaurant) => {
                                const restaurantId = restaurant.id || restaurant._id;
                                const isActive = restaurant.active !== false; // Default to true if undefined
                                const isToggling = togglingId === restaurantId;

                                return (
                                    <div key={restaurantId} className="restaurant-item-wrapper">
                                        <button
                                            onClick={() => handleSelectRestaurant(restaurantId)}
                                            disabled={loading || !isActive}
                                            className={`restaurant-item ${!isActive ? 'inactive' : ''}`}
                                        >
                                            <div className="rest-info">
                                                <div className="rest-avatar">
                                                    {restaurant.name.charAt(0)}
                                                </div>
                                                <div className="rest-details">
                                                    <h3>{restaurant.name}</h3>
                                                    <div className="rest-meta">
                                                        <span className="role-badge">{t(restaurant.role) || t('member')}</span>
                                                        <span
                                                            className="status-badge subscription-status"
                                                            style={{
                                                                ...getStatusBadgeStyle(subscriptions[restaurantId]?.status || 'suspended'),
                                                                fontSize: '0.65rem',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            {getStatusLabel((subscriptions[restaurantId]?.status || 'suspended').toLowerCase(), t)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="chevron" />
                                        </button>

                                        {/* Toggle Switch (Owner only) */}
                                        {isOwner && (
                                            <button
                                                onClick={(e) => handleToggleActive(e, restaurantId)}
                                                disabled={isToggling}
                                                className={`toggle-btn ${isActive ? 'active' : 'inactive'}`}
                                                title={isActive ? t('deactivate_establishment') : t('activate_establishment')}
                                            >
                                                <Power size={14} className={isToggling ? 'spinning' : ''} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            <button
                                onClick={() => navigate('/create-restaurant')}
                                className="add-new-btn"
                            >
                                <PlusCircle size={20} />
                                <span>{t('add_new_establishment')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="selection-footer">
                        <button onClick={handleLogout} className="logout-btn">
                            <LogOut size={16} />
                            <span>{t('logout_of')} {user?.email}</span>
                        </button>
                    </div>
                </div>
                {loading && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20,
                        borderRadius: '16px'
                    }}>
                        <LoadingSpinner size={48} />
                    </div>
                )}
            </div>

            {/* RIGHT SIDE: IMAGE */}
            <div className="selection-right">
                <div className="image-overlay"></div>
                <div className="image-content animate-slide-up">
                    <h2>{t('manage_everything_place')}</h2>
                    <p>{t('control_orders_tables_desc')}</p>
                </div>
                <img
                    src="/image/interno.avif"
                    alt="Restaurant Ambiance"
                    className="responsive-image"
                />
            </div>
        </div>
    );
};

export default RestaurantSelection;
