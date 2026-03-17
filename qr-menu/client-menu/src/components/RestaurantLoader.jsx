import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import axios from 'axios';
import { API_URL } from '../config/api';
import LoadingSpinner from './LoadingSpinner';

/**
 * RestaurantLoader
 * A wrapper component that fetches restaurant settings globally
 * and populates the CurrencyContext.
 */
const RestaurantLoader = ({ children }) => {
    const { restaurantId } = useParams();
    const { setRestaurant, restaurant } = useCurrency();
    const [loading, setLoading] = useState(!restaurant);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!restaurantId) return;
            
            try {
                // If we already have settings for this restaurant, don't fetch again
                if (restaurant && (restaurant._id === restaurantId || restaurant.id === restaurantId)) {
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${API_URL}/restaurants/${restaurantId}`);
                if (response.data?.restaurant) {
                    setRestaurant(response.data.restaurant);
                }
            } catch (err) {
                console.error('Failed to fetch restaurant settings:', err);
                setError('Failed to load restaurant configuration');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [restaurantId, setRestaurant]);

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
