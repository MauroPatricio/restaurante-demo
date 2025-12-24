import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Assuming api.authAPI.getProfile exists
                    const { data } = await api.get('/auth/me');
                    let currentUser = data.user;

                    // Attempt to restore restaurant context from localStorage
                    const savedRestaurantId = localStorage.getItem('restaurantId');
                    if (savedRestaurantId && currentUser.restaurants) {
                        // Find the full restaurant object in the user's accessible list
                        const activeDetails = currentUser.restaurants.find(r => r.id === savedRestaurantId || r._id === savedRestaurantId);
                        if (activeDetails) {
                            currentUser.restaurant = activeDetails;
                        }
                    }

                    setUser(currentUser);
                } catch (error) {
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const login = async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return data;
    };

    const selectRestaurant = async (restaurantId) => {
        const { data } = await api.post('/auth/select-restaurant', { restaurantId });
        localStorage.setItem('token', data.token);
        localStorage.setItem('restaurantId', restaurantId);

        // Update user state with the selected restaurant context
        setUser(prev => ({
            ...prev,
            restaurant: data.restaurant,
            subscription: data.subscription
        }));

        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('restaurantId');
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        loading,
        login,
        selectRestaurant,
        logout,
        isAuthenticated: !!user
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
