import axios from 'axios';
import { API_URL } from '../config/api';
import { loadingManager } from '../utils/loadingManager';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // 15 seconds timeout
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        // Trigger loading overlay
        loadingManager.start();

        // Add auth token if available (from URL or storage)
        // Standardize token retrieval
        const searchParams = new URL(window.location.href).searchParams;
        const token = searchParams.get('token')
            || localStorage.getItem(`token-ref-${config.params?.restaurantId || ''}`)
            || JSON.parse(sessionStorage.getItem('qr_validation') || '{}')?.token;

        if (token && !config.headers.Authorization) {
            // Some endpoints might need Authorization header, others use it in body/query.
            // We'll add it to headers just in case backend supports it, 
            // but we won't force it if specific calls set it manually.
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        loadingManager.stop();
        return Promise.reject(error);
    }
);

// Response Interceptor
api.interceptors.response.use(
    (response) => {
        loadingManager.stop();
        return response;
    },
    async (error) => {
        const { config, response } = error;

        // Timeout handling or Network Error
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || !response) {
            // Basic retry logic for GET requests only
            if (config && config.method === 'get' && !config._retry) {
                config._retry = true;
                // Exponential backoff or simple delay? Let's trying once more after 1s
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Manually restart loading since the previous one stopped on error
                loadingManager.start();
                return api(config);
            }
        }

        loadingManager.stop();
        return Promise.reject(error);
    }
);

export default api;
