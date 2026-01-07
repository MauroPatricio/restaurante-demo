import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth interceptor
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
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

// Admin-only API calls for subscription management
const subscriptionAPI = {
    // Get all subscriptions (admin only)
    getAll: async (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.status && filters.status !== 'all') {
            params.append('status', filters.status);
        }
        if (filters.search) {
            params.append('search', filters.search);
        }
        if (filters.sortBy) {
            params.append('sortBy', filters.sortBy);
        }
        if (filters.order) {
            params.append('order', filters.order);
        }

        return api.get(`/subscriptions/admin/all?${params.toString()}`);
    },

    // Update subscription status (admin only)
    updateStatus: async (subscriptionId, status, reason = '') => {
        return api.patch(`/subscriptions/admin/${subscriptionId}/status`, {
            status,
            reason
        });
    },

    // Get audit logs (admin only)
    getAuditLogs: async (subscriptionId = null, page = 1, limit = 50) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        if (subscriptionId) {
            params.append('subscriptionId', subscriptionId);
        }

        return api.get(`/subscriptions/admin/audit-logs?${params.toString()}`);
    }
};

export default subscriptionAPI;
