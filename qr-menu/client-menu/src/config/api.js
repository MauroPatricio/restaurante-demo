/**
 * API Configuration
 * Centralized API and Socket URLs for easy maintenance
 */

// Base URLs - edit these to change API location for all components
export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

// You can also add other API-related constants here
export const API_TIMEOUT = 10000; // 10 seconds
export const SOCKET_RECONNECTION_ATTEMPTS = 5;
