/**
 * API Configuration
 * Centralized API and Socket URLs for easy maintenance
 */

// Base URLs - edit these to change API location for all components
// Base URLs - edit these to change API location for all components
// Dynamic API URL: aligns with the current hostname (localhost or LAN IP) on port 5000
const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
let baseApi = import.meta.env.VITE_API_URL || `http://${hostname}:5000/api`;

if (baseApi.startsWith('http') && !baseApi.toLowerCase().includes('/api')) {
    baseApi = baseApi.endsWith('/') ? `${baseApi}api` : `${baseApi}/api`;
}
export const API_URL = baseApi;
// Dynamic Socket URL: aligns with the current hostname (localhost or LAN IP) on port 5000
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${hostname}:5000`;

// You can also add other API-related constants here
export const API_TIMEOUT = 10000; // 10 seconds
export const SOCKET_RECONNECTION_ATTEMPTS = 5;
