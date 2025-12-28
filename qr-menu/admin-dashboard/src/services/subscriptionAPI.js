import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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

        return axios.get(`${API_URL}/subscriptions/admin/all?${params.toString()}`);
    },

    // Update subscription status (admin only)
    updateStatus: async (subscriptionId, status, reason = '') => {
        return axios.patch(`${API_URL}/subscriptions/admin/${subscriptionId}/status`, {
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

        return axios.get(`${API_URL}/subscriptions/admin/audit-logs?${params.toString()}`);
    }
};

export default subscriptionAPI;
