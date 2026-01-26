import axios from 'axios';
import { loadingManager, LOADING_TYPES } from '../utils/loadingManager';

// Determine API URL based on environment
let base;

if (import.meta.env.VITE_API_URL) {
    base = import.meta.env.VITE_API_URL;
} else {
    const hostname = window.location.hostname;

    if (hostname.includes('gestaomodernaonline.com')) {
        // Production
        base = 'https://api.gestaomodernaonline.com/api';
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Local development - Use relative path to leverage Vite Proxy
        base = '/api';
    } else {
        // LAN
        base = `http://${hostname}:5000/api`;
    }
}

const API_URL = base;

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // 15 seconds timeout
    headers: {
        'Content-Type': 'application/json'
    }
});

// Health check function - uses full URL to bypass /api prefix
api.healthCheck = () => axios.get(`${API_URL.replace('/api', '')}/health`);

api.interceptors.request.use(
    (config) => {
        const type = config.background ? LOADING_TYPES.BACKGROUND : LOADING_TYPES.FULL;
        loadingManager.start(type);

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // Default to full, or try to infer from config if possible (though config might not be available)
        loadingManager.stop(LOADING_TYPES.FULL);
        // Also stop background just in case, or we need a way to know which one failed. 
        // Ideally we should know, but for error case let's try to stop current active one if we could track it.
        // For now, let's play safe and reset or stop the most likely.
        // Actually, loadingManager.stop() handles counters. If we don't know the type, it might be tricky.
        // But the error usually comes from a request that *started*.
        // If we can't determine, maybe we should stop both to be safe? 
        // Or better: check error.config.
        if (error.config) {
            const type = error.config.background ? LOADING_TYPES.BACKGROUND : LOADING_TYPES.FULL;
            loadingManager.stop(type);
        } else {
            loadingManager.stop(); // Default full
        }
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => {
        const type = response.config.background ? LOADING_TYPES.BACKGROUND : LOADING_TYPES.FULL;
        loadingManager.stop(type);
        return response;
    },
    async (error) => {
        const { config, response } = error;

        const type = config && config.background ? LOADING_TYPES.BACKGROUND : LOADING_TYPES.FULL;

        // Timeout handling or Network Error - Retry GET requests once
        if ((error.code === 'ECONNABORTED' || error.message.includes('timeout') || !response) && config && config.method === 'get' && !config._retry) {
            config._retry = true;
            loadingManager.stop(type); // Stop previous
            await new Promise(resolve => setTimeout(resolve, 1000));
            loadingManager.start(type); // Restart loading (with same type) for the retry effort
            return api(config);
        }

        loadingManager.stop(type);
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('restaurantId');
            window.location.href = '/login';
        } else if (error.response?.status === 402) {
            // Subscription expired - Payment Required
            const errorData = error.response.data;

            // Store subscription error info for display
            if (errorData.subscription) {
                sessionStorage.setItem('subscriptionError', JSON.stringify(errorData.subscription));
            }

            // Redirect to subscription page
            // Only redirect if not already on subscription page
            if (!window.location.pathname.includes('/subscription')) {
                window.location.href = '/dashboard/subscription';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getProfile: () => api.get('/auth/me'),
    updateFCMToken: (token) => api.post('/auth/fcm-token', { fcmToken: token })
};

// Restaurant API
export const restaurantAPI = {
    get: (id) => api.get(`/restaurants/${id}`),
    update: (id, data) => {
        const config = {};
        if (data instanceof FormData) {
            config.headers = { 'Content-Type': 'multipart/form-data' };
        }
        return api.patch(`/restaurants/${id}`, data, config);
    },
    updateSettings: (id, settings) => api.patch(`/restaurants/${id}/settings`, { settings }),
    toggleActive: (id) => api.patch(`/restaurants/${id}/toggle-active`, {}, { background: true })
};

// Menu API
export const menuAPI = {
    getAll: (restaurantId, params) => api.get(`/menu/${restaurantId}`, { params }),
    getCategories: (restaurantId) => api.get(`/menu/${restaurantId}/categories`),
    create: (data) => {
        return api.post('/menu-items', data);
    },
    update: (id, data) => {
        return api.patch(`/menu-items/${id}`, data);
    },
    delete: (id) => api.delete(`/menu-items/${id}`)
};

// Table API
export const tableAPI = {
    getAll: (restaurantId, config = {}) => api.get(`/tables/restaurant/${restaurantId}`, config),
    get: (id) => api.get(`/tables/${id}`),
    create: (data) => api.post('/tables', data),
    update: (id, data) => api.patch(`/tables/${id}`, data),
    delete: (id) => api.delete(`/tables/${id}`),
    // Table Session Management
    getCurrentSession: (id) => api.get(`/tables/${id}/current-session`),
    freeTable: (id) => api.post(`/tables/${id}/free`),
    getSessionHistory: (id, params) => api.get(`/tables/${id}/session-history`, { params }),
    // Table Order History & Status
    getOrders: (tableId, params = {}) => api.get(`/tables/${tableId}/orders`, { params }),
    updateStatus: (tableId, status, reason = '') => api.patch(`/tables/${tableId}/status`, { status, reason })
};

// Order API
export const orderAPI = {
    getAll: (restaurantId, params, config = {}) => api.get(`/orders/restaurant/${restaurantId}`, { params, ...config }),
    get: (id) => api.get(`/orders/${id}`),
    create: (data) => api.post('/orders', data),
    updateStatus: (id, status, paymentStatus, config = {}) => api.patch(`/orders/${id}`, { status, paymentStatus }, config)
};

// Coupon API
export const couponAPI = {
    getAll: (restaurantId, params) => api.get(`/coupons/${restaurantId}`, { params }),
    create: (data) => api.post('/coupons', data),
    update: (id, data) => api.patch(`/coupons/${id}`, data),
    delete: (id) => api.delete(`/coupons/${id}`),
    validate: (data) => api.post('/coupons/validate', data)
};

// Feedback API
export const feedbackAPI = {
    getAll: (restaurantId, params) => api.get(`/feedback/${restaurantId}`, { params }),
    getStats: (restaurantId) => api.get(`/feedback/${restaurantId}/stats`)
};

// Subscription API
export const subscriptionAPI = {
    get: (restaurantId) => api.get(`/subscriptions/${restaurantId}`),
    getHistory: (restaurantId) => api.get(`/subscriptions/${restaurantId}/history`),
    createPayment: (data) => api.post('/subscriptions/pay', data),
    renew: (data) => api.post('/subscriptions/pay', data), // Corrected endpoint for renewal to match backend
    uploadProof: async (file) => {
        const formData = new FormData();
        formData.append('proof', file);
        return api.post('/subscriptions/proof', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

// Delivery API
export const deliveryAPI = {
    getAll: (restaurantId, params) => api.get(`/delivery/restaurant/${restaurantId}`, { params }),
    assign: (id, deliveryPersonId) => api.patch(`/delivery/${id}/assign`, { deliveryPersonId })
};

// User Management API
export const usersAPI = {
    getAll: () => api.get('/users'),
    getByRestaurant: (restaurantId, params) => api.get(`/users/restaurant/${restaurantId}`, { params }),
    create: (data) => api.post('/users', data),
    createForRestaurant: (restaurantId, data) => api.post(`/users/restaurant/${restaurantId}`, data),
    update: (id, data) => api.patch(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    toggleActive: (id) => api.patch(`/users/${id}/toggle-active`),
    resetPassword: (id) => api.post(`/users/${id}/reset-password`),
    changePassword: (data) => api.post('/auth/change-password', data)
};

// Role API
export const roleAPI = {
    getAll: () => api.get('/roles')
};

// Role Management API
export const rolesAPI = {
    getAll: () => api.get('/roles'),
    create: (data) => api.post('/roles', data),
    update: (id, data) => api.patch(`/roles/${id}`, data),
    delete: (id) => api.delete(`/roles/${id}`)
};
// Analytics API
export const analyticsAPI = {
    getFinancial: (restaurantId, params) => api.get(`/analytics/${restaurantId}/financial`, { params }),
    getSales: (restaurantId, params) => api.get(`/analytics/${restaurantId}/sales`, { params }),
    getOperational: (restaurantId, params) => api.get(`/analytics/${restaurantId}/operational`, { params }),
    getInventory: (restaurantId) => api.get(`/analytics/${restaurantId}/inventory`),
    getCustomers: (restaurantId, params) => api.get(`/analytics/${restaurantId}/customers`, { params }),
    getHall: (restaurantId, params) => api.get(`/analytics/${restaurantId}/hall`, { params }),
    getTableHistory: (restaurantId, tableId) => api.get(`/analytics/${restaurantId}/hall/${tableId}/history`),
    generateReceipt: (orderId, data) => api.post(`/analytics/orders/${orderId}/receipt`, data),
    clearOwnerStats: () => api.post('/analytics/owner/clear-stats')
};

// Category API
export const categoryAPI = {
    getAll: (restaurantId, includeInactive = false) => api.get(`/categories/${restaurantId}`, {
        params: { includeInactive }
    }),
    get: (id) => api.get(`/categories/detail/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
    reorder: (categories) => api.patch('/categories/reorder', { categories })
};

// Subcategory API
export const subcategoryAPI = {
    getByCategory: (categoryId, includeInactive = false) => api.get(`/subcategories/category/${categoryId}`, {
        params: { includeInactive }
    }),
    getByRestaurant: (restaurantId, includeInactive = false) => api.get(`/subcategories/restaurant/${restaurantId}`, {
        params: { includeInactive }
    }),
    get: (id) => api.get(`/subcategories/${id}`),
    create: (data) => api.post('/subcategories', data),
    update: (id, data) => api.put(`/subcategories/${id}`, data),
    delete: (id) => api.delete(`/subcategories/${id}`),
    reorder: (subcategories) => api.patch('/subcategories/reorder', { subcategories })
};

// Upload API
export const uploadAPI = {
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        return api.post('/menu-items/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            background: true
        });
    }
};

// Client API
export const clientAPI = {
    getAll: (restaurantId) => api.get('/clients', { params: { restaurantId } })
};

// Waiter Analytics API
export const waiterAnalyticsAPI = {
    getAll: (restaurantId, params) => api.get(`/analytics/${restaurantId}/waiters`, { params }),
    getDetails: (restaurantId, waiterId, params) => api.get(`/analytics/${restaurantId}/waiters/${waiterId}`, { params }),
    getRanking: (restaurantId, params) => api.get(`/analytics/${restaurantId}/waiters/ranking`, { params })
};

// Weekly Menu API
export const weeklyMenuAPI = {
    getAll: (restaurantId, params) => api.get(`/weekly-menus/${restaurantId}`, { params }),
    getActive: (restaurantId) => api.get(`/weekly-menus/${restaurantId}/active`),
    create: (data) => api.post('/weekly-menus', data),
    update: (id, data) => api.patch(`/weekly-menus/${id}`, data),
    activate: (id) => api.post(`/weekly-menus/${id}/activate`),
    deactivate: (id) => api.post(`/weekly-menus/${id}/deactivate`),
    archive: (id) => api.delete(`/weekly-menus/${id}`)
};

// Stock Management API
export const stockAPI = {
    getItems: (restaurantId) => api.get(`/stock/${restaurantId}/items`),
    getLowStock: (restaurantId, threshold) => api.get(`/stock/${restaurantId}/low-stock`, { params: { threshold } }),
    getMovements: (restaurantId, params) => api.get(`/stock/${restaurantId}/movements`, { params }),
    getReport: (restaurantId, params) => api.get(`/stock/${restaurantId}/report`, { params }),
    restock: (data) => api.post('/stock/restock', data),
    adjust: (data) => api.post('/stock/adjust', data)
};

export const waiterCallAPI = {
    getActive: (restaurantId, waiterId = null) => api.get('/waiter-calls/active', {
        params: { restaurantId, waiterId }
    }),
    resolve: (id) => api.post(`/waiter-calls/${id}/resolve`, {}, { background: true }),
    acknowledge: (id) => api.post(`/waiter-calls/${id}/acknowledge`)
};

export default api;


