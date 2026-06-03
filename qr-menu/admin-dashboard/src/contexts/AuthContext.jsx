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

// Read user from localStorage synchronously so the first render already has the
// correct role — prevents the button from flashing in after the API round-trip.
const getInitialUser = () => {
    try {
        const stored = localStorage.getItem('user');
        if (stored) return JSON.parse(stored);
    } catch {
        // ignore malformed JSON
    }
    return null;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(getInitialUser);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            const restaurantId = localStorage.getItem('restaurantId');


            if (token) {
                try {
                    // Call /auth/me to get full user profile with role & restaurant context
                    // Backend is now enriched to provide this in ONE call
                    const { data } = await api.get('/auth/me');
                    setUser(data.user);
                    // Keep localStorage in sync so the next cold start is instant too
                    localStorage.setItem('user', JSON.stringify(data.user));
                } catch (error) {
                    console.error('❌ Failed to load user:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('restaurantId');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            } else {
                // No token — clear any stale cached user
                localStorage.removeItem('user');
                setUser(null);
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const login = async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        // Set token first so /auth/me request is authenticated
        localStorage.setItem('token', data.token);

        // Immediately fetch the fully-enriched profile (includes role.isSystem, restaurants, etc.)
        // This ensures the AuthContext user is complete BEFORE navigate() is called in Login.jsx,
        // so role-conditional UI (like the Super Admin button) is correct on the first render.
        let enrichedUser = data.user;
        try {
            const meResponse = await api.get('/auth/me');
            enrichedUser = {
                ...meResponse.data.user,
                // Preserve restaurants list from login response if /auth/me doesn't include it
                restaurants: meResponse.data.user?.restaurants?.length
                    ? meResponse.data.user.restaurants
                    : data.user.restaurants || []
            };
        } catch (meErr) {
            console.warn('⚠️ /auth/me failed after login, using login response data:', meErr);
        }

        // Persist enriched user synchronously so getInitialUser() on next mount is instant
        localStorage.setItem('user', JSON.stringify(enrichedUser));
        setUser(enrichedUser);

        // Return enriched data so Login.jsx can pass correct restaurants in router state
        return { ...data, user: enrichedUser };
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

    const refreshProfile = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            return data.user;
        } catch (error) {
            console.error('❌ Failed to refresh profile:', error);
        }
    };

    const updateRestaurantSettings = (newSettings) => {
        setUser(prev => {
            if (!prev) return prev;
            const updatedUser = {
                ...prev,
                restaurant: {
                    ...prev.restaurant,
                    settings: {
                        ...(prev.restaurant?.settings || {}),
                        ...newSettings
                    }
                }
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    const logout = async (logoutType = 'manual') => {
        try {
            const token = localStorage.getItem('token');
            const restaurantId = localStorage.getItem('restaurantId');
            
            if (token) {
                // Call backend API to revoke token and audit log logout event
                await api.post('/auth/logout', { logoutType, restaurantId }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error logging out on backend:', error);
        } finally {
            // Reset user state in memory
            setUser(null);
            
            // Clear Local Storage & Session Storage
            localStorage.clear();
            sessionStorage.clear();

            // Clear Cache Storage (Application API and page cache)
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                } catch (cErr) {
                    console.error('❌ Error clearing Cache Storage:', cErr);
                }
            }

            // Unregister Service Workers (PWA / Offline cache)
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        await registration.unregister();
                    }
                } catch (swErr) {
                    console.error('❌ Error unregistering service workers:', swErr);
                }
            }

            // Clear IndexedDB databases if any are present (Offline data/pending orders)
            if ('indexedDB' in window && indexedDB.databases) {
                try {
                    const dbs = await indexedDB.databases();
                    for (const db of dbs) {
                        if (db.name) {
                            indexedDB.deleteDatabase(db.name);
                        }
                    }
                } catch (dbErr) {
                    console.warn('⚠️ Error clearing IndexedDB databases:', dbErr);
                }
            }

            // Protect against reverse navigation by replacing history state
            window.history.pushState(null, '', '/login');
            
            // Redirect to login page and trigger success message
            window.location.href = '/login?logoutSuccess=true';
        }
    };

    const value = {
        user,
        loading,
        login,
        selectRestaurant,
        logout,
        refreshProfile,
        updateRestaurantSettings,
        isAuthenticated: !!user
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
