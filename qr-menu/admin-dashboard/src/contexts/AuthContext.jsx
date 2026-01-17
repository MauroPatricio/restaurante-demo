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
            const restaurantId = localStorage.getItem('restaurantId');

            console.log('🔍 AuthContext - Loading user...');
            console.log('  Token exists:', !!token);
            console.log('  RestaurantId in storage:', restaurantId);

            if (token) {
                try {
                    // Call /auth/me to get full user profile with role & restaurant context
                    // Backend is now enriched to provide this in ONE call
                    const { data } = await api.get('/auth/me');
                    setUser(data.user);
                } catch (error) {
                    console.error('❌ Failed to load user:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('restaurantId');
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
        localStorage.setItem('user', JSON.stringify({
            ...user,
            restaurant: data.restaurant,
            role: data.role, // This should be the full role object from backend
            subscription: data.subscription
        }));

        // Call /auth/me to get the FULL role object with isSystem
        try {
            const meResponse = await api.get('/auth/me');
            console.log('✅ /auth/me after selectRestaurant:', meResponse.data);
            console.log('  Role:', meResponse.data.user?.role);
            console.log('  isSystem:', meResponse.data.user?.role?.isSystem);

            // Update user state with complete role object including isSystem
            setUser(meResponse.data.user);

            // Also update localStorage
            localStorage.setItem('user', JSON.stringify(meResponse.data.user));
        } catch (error) {
            console.error('❌ Failed to get /auth/me after selectRestaurant:', error);
            // Fallback: use data from select-restaurant
            setUser(prev => ({
                ...prev,
                restaurant: data.restaurant,
                role: data.role,
                subscription: data.subscription
            }));
        }

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
