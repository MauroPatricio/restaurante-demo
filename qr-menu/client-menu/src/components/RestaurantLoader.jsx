import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { useNotification } from '../context/NotificationContext';
import axios from 'axios';
import { API_URL } from '../config/api';
import LoadingSpinner from './LoadingSpinner';

const RestaurantLoader = ({ children }) => {
    const { restaurantId } = useParams();
    const { setRestaurant, restaurant } = useCurrency();
    const { lastMenuUpdate } = useNotification?.() || {};
    const [loading, setLoading] = useState(!restaurant);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSettings = async (force = false) => {
            if (!restaurantId) return;
            
            try {
                // If we already have settings for this restaurant, don't fetch again unless forced
                if (!force && restaurant && (restaurant._id === restaurantId || restaurant.id === restaurantId)) {
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${API_URL}/restaurants/${restaurantId}`);
                if (response.data?.restaurant) {
                    setRestaurant(response.data.restaurant);
                }
            } catch (err) {
                console.error('Failed to fetch restaurant settings:', err);
                // Only show full-screen error if we don't already have some valid data
                if (!restaurant) setError('Failed to load restaurant configuration');
            } finally {
                setLoading(false);
            }
        };

        // If lastMenuUpdate changes, we force a re-fetch
        const forceFetch = lastMenuUpdate > 0 && restaurant;
        fetchSettings(forceFetch);
    }, [restaurantId, setRestaurant, lastMenuUpdate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <LoadingSpinner size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 text-center">
                <div className="text-red-500 mb-4 font-bold">⚠️ {error}</div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold"
                >
                    Retry
                </button>
            </div>
        );
    }

    return children;
};

export default RestaurantLoader;
