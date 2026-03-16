import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
    async (config) => {
        // Add any auth tokens here if needed
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

// Menu API
export const menuAPI = {
    getMenu: (restaurantId: string, params: any = {}) =>
        api.get(`/menu/${restaurantId}`, { params }),

    getCategories: (restaurantId: string) =>
        api.get(`/menu/${restaurantId}/categories`),
};

// Order API
export const orderAPI = {
    createOrder: (orderData: any) =>
        api.post('/orders', orderData),

    getOrder: (orderId: string) =>
        api.get(`/orders/${orderId}`),

    updateOrderStatus: (orderId: string, status: string) =>
        api.patch(`/orders/${orderId}`, { status }),
};

// Payment API
export const paymentAPI = {
    initiateMpesa: (paymentData: any) =>
        api.post('/payments/mpesa', paymentData),

    initiateEmola: (paymentData: any) =>
        api.post('/payments/emola', paymentData),

    recordCash: (paymentData: any) =>
        api.post('/payments/cash', paymentData),

    getPaymentStatus: (reference: string) =>
        api.get(`/payments/${reference}`),
};

// Coupon API
export const couponAPI = {
    validate: (couponData: any) =>
        api.post('/coupons/validate', couponData),
};

// Feedback API
export const feedbackAPI = {
    submit: (feedbackData: any) =>
        api.post('/feedback', feedbackData),
};

export default api;
