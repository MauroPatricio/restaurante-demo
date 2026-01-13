/**
 * API Configuration
 * Centralized API and Socket URLs for easy maintenance
 */

// Base URLs - edit these to change API location for all components
// Base URLs - edit these to change API location for all components
// Determine API URL based on environment
let baseApi;
let socketUrl;

if (import.meta.env.VITE_API_URL) {
    // Use environment variable if set
    baseApi = import.meta.env.VITE_API_URL;
} else {
    // Auto-detect based on hostname
    const hostname = window.location.hostname;

    if (hostname.includes('gestaomodernaonline.com')) {
        // Production environment
        baseApi = 'https://api.gestaomodernaonline.com/api';
        socketUrl = 'https://api.gestaomodernaonline.com';
    } else if (hostname === 'localhost') {
        // Local development (localhost)
        baseApi = 'http://127.0.0.1:5000/api';
        socketUrl = 'http://127.0.0.1:5000';
    } else {
        // Local network (LAN IP)
        baseApi = `http://${hostname}:5000/api`;
        socketUrl = `http://${hostname}:5000`;
    }
}

// Ensure /api suffix
if (baseApi && baseApi.startsWith('http') && !baseApi.toLowerCase().includes('/api')) {
    baseApi = baseApi.endsWith('/') ? `${baseApi}api` : `${baseApi}/api`;
}

export const API_URL = baseApi;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || socketUrl;

// You can also add other API-related constants here
export const API_TIMEOUT = 10000; // 10 seconds
export const SOCKET_RECONNECTION_ATTEMPTS = 5;
