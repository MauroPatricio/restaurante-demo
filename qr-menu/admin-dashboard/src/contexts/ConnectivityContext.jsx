import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const ConnectivityContext = createContext();

export const useConnectivity = () => {
    const context = useContext(ConnectivityContext);
    if (!context) {
        throw new Error('useConnectivity must be used within ConnectivityProvider');
    }
    return context;
};

export const ConnectivityProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [apiStatus, setApiStatus] = useState('checking'); // 'connected', 'disconnected', 'checking'
    const [lastCheck, setLastCheck] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [toasts, setToasts] = useState([]);

    const checkIntervalRef = useRef(null);
    const debounceTimerRef = useRef(null);
    const lastApiStatusRef = useRef(apiStatus);
    const lastOnlineStatusRef = useRef(isOnline);

    // Toast management
    const addToast = useCallback((type, message, persistent = false, duration = 3000) => {
        const id = Date.now() + Math.random();

        // Remove existing toast of same type to avoid duplicates
        setToasts(prev => prev.filter(t => t.type !== type));

        const newToast = { id, type, message, persistent, removing: false };
        setToasts(prev => [...prev, newToast]);

        if (!persistent && duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300); // Match animation duration
    }, []);

    // Check API health
    const checkAPIHealth = useCallback(async () => {
        if (!isOnline) {
            setApiStatus('disconnected');
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            console.log('🔍 Checking API health...');
            const response = await api.healthCheck();
            clearTimeout(timeoutId);
            console.log('✅ API health check successful:', response.status);

            setApiStatus('connected');
            setLastCheck(new Date());
            setRetryCount(0);
        } catch (error) {
            console.error('❌ API health check failed:', error.message);
            console.error('Error details:', error);
            setApiStatus('disconnected');
            setRetryCount(prev => prev + 1);
        }
    }, [isOnline]);

    // Debounced API check
    const debouncedAPICheck = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            checkAPIHealth();
        }, 500);
    }, [checkAPIHealth]);

    // Handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            debouncedAPICheck();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setApiStatus('disconnected');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [debouncedAPICheck]);

    // Periodic API health check
    useEffect(() => {
        // Initial check
        checkAPIHealth();

        // Set up interval
        checkIntervalRef.current = setInterval(() => {
            checkAPIHealth();
        }, 10000); // Every 10 seconds

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [checkAPIHealth]);

    // Show toasts based on status changes
    useEffect(() => {
        // TEMPORARILY DISABLED FOR DEBUGGING
        return;

        // Internet status changed
        if (lastOnlineStatusRef.current !== isOnline) {
            if (!isOnline) {
                addToast('error', 'Sem conexão com a internet', true);
            } else {
                addToast('success', 'Conexão com a internet restaurada', false, 3000);
            }
            lastOnlineStatusRef.current = isOnline;
        }

        // API status changed
        if (lastApiStatusRef.current !== apiStatus && apiStatus !== 'checking') {
            if (apiStatus === 'connected' && lastApiStatusRef.current === 'disconnected') {
                addToast('success', 'Conectado à API com sucesso', false, 3000);
            } else if (apiStatus === 'disconnected' && isOnline) {
                const message = retryCount > 0
                    ? `API indisponível. Tentativa ${retryCount}/3...`
                    : 'API indisponível. A tentar reconectar...';
                addToast('error', message, retryCount >= 3);
            }
            lastApiStatusRef.current = apiStatus;
        }
    }, [isOnline, apiStatus, retryCount, addToast]);

    const value = {
        isOnline,
        apiStatus,
        lastCheck,
        retryCount,
        toasts,
        addToast,
        removeToast,
        checkAPIHealth,
        isBackendConnected: apiStatus === 'connected' // Computed: true if API is connected
    };

    return (
        <ConnectivityContext.Provider value={value}>
            {children}
        </ConnectivityContext.Provider>
    );
};
