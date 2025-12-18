import api from './api';

export const analyticsAPI = {
    getOwnerStats: (params) => api.get('/analytics/owner', { params }),
    getRestaurantStats: (restaurantId, params) => api.get(`/analytics/restaurant/${restaurantId}`, { params })
};
