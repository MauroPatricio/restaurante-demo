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
                    // Call /auth/me to get full user profile with role
                    const { data } = await api.get('/auth/me');
                    console.log('✅ /auth/me response:', data);
                    console.log('  User:', data.user?.name);
                    console.log('  Restaurant:', data.user?.restaurant?.name);
                    console.log('  Restaurant active:', data.user?.restaurant?.active);
                    console.log('  Restaurant logo:', data.user?.restaurant?.logo);

                    // If restaurant data is missing but restaurantId exists in localStorage,
                    // fetch restaurant manually (happens when old token doesn't have restaurantId)
                    if (!data.user?.restaurant && restaurantId) {
                        console.log('⚠️  Restaurant not in token, fetching manually...');
                        try {
                            const restaurantRes = await api.get(`/restaurants/${restaurantId}`);
                            console.log('✅ Restaurant fetched:', restaurantRes.data);
                            data.user.restaurant = restaurantRes.data;

                            // Also get user role for this restaurant
                            const roleRes = await api.get(`/users/${data.user._id}/restaurants/${restaurantId}/role`);
                            data.user.role = roleRes.data.role;
                            data.user.subscription = restaurantRes.data.subscription;
                        } catch (fetchError) {
                            console.error('❌ Failed to fetch restaurant:', fetchError);
                        }
                    }

                    setUser(data.user);
                } catch (error) {
                    console.error('❌ Failed to load user:', error);
                    console.error('  Error response:', error.response?.data);
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

        // Update user state with the selected restaurant context and role
        setUser(prev => ({
            ...prev,
            restaurant: data.restaurant,
            role: { name: data.role }, // Add role from backend response
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
