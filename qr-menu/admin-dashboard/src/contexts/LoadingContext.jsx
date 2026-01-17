import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadingManager } from '../utils/loadingManager';
import LoadingOverlay from '../components/LoadingOverlay';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = loadingManager.subscribe((loading) => {
            setIsLoading(loading);
        });
        return unsubscribe;
    }, []);

    // Manual controls exposed to context consumers if needed
    const showLoading = () => loadingManager.start();
    const hideLoading = () => loadingManager.stop();

    return (
        <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
            {children}
            {isLoading && <LoadingOverlay />}
        </LoadingContext.Provider>
    );
};
