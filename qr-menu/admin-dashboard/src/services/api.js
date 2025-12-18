import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add token
api.healthCheck = () => axios.get(`${API_URL.replace('/api', '')}/health`);

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
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
    update: (id, data) => api.patch(`/restaurants/${id}`, data)
};

// Menu API
export const menuAPI = {
    getAll: (restaurantId, params) => api.get(`/menu/${restaurantId}`, { params }),
    getCategories: (restaurantId) => api.get(`/menu/${restaurantId}/categories`),
    create: (data) => api.post('/menu-items', data),
    update: (id, data) => api.patch(`/menu-items/${id}`, data),
    delete: (id) => api.delete(`/menu-items/${id}`)
};

// Table API
export const tableAPI = {
    getAll: (restaurantId) => api.get(`/tables/restaurant/${restaurantId}`),
    get: (id) => api.get(`/tables/${id}`),
    create: (data) => api.post('/tables', data),
    update: (id, data) => api.patch(`/tables/${id}`, data),
    delete: (id) => api.delete(`/tables/${id}`)
};

// Order API
export const orderAPI = {
    getAll: (restaurantId, params) => api.get(`/orders/restaurant/${restaurantId}`, { params }),
    get: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, status) => api.patch(`/orders/${id}`, { status })
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
    getHistory: (restaurantId) => api.get(`/subscriptions/${restaurantId}/history`)
};

// Delivery API
export const deliveryAPI = {
    getAll: (restaurantId, params) => api.get(`/delivery/restaurant/${restaurantId}`, { params }),
    assign: (id, deliveryPersonId) => api.patch(`/delivery/${id}/assign`, { deliveryPersonId })
};

// User Management API
export const usersAPI = {
    getAll: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.patch(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    resetPassword: (id) => api.post(`/users/${id}/reset-password`),
    changePassword: (data) => api.post('/auth/change-password', data)
};

// Role Management API
export const rolesAPI = {
    getAll: () => api.get('/roles'),
    create: (data) => api.post('/roles', data),
    update: (id, data) => api.patch(`/roles/${id}`, data),
    delete: (id) => api.delete(`/roles/${id}`)
};

export default api;
