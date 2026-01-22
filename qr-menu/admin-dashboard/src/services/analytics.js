import api from './api';

export const analyticsAPI = {
    getOwnerStats: (params) => api.get('/analytics/owner', { params }),
    getRestaurantStats: (restaurantId, params) => api.get(`/analytics/restaurant/${restaurantId}`, { params }),
    getFinancialReport: (restaurantId, params) => api.get(`/analytics/${restaurantId}/financial`, { params }),
    getSalesReport: (restaurantId, params) => api.get(`/analytics/${restaurantId}/sales`, { params }),
    getOperationalReport: (restaurantId, params) => api.get(`/analytics/${restaurantId}/operational`, { params }),
    getInventoryReport: (restaurantId, params) => api.get(`/analytics/${restaurantId}/inventory`, { params }),
    clearOwnerStats: () => api.post('/analytics/owner/clear-stats', {}, { background: true })
};
