import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadingManager, LOADING_TYPES } from '../utils/loadingManager';
import GlobalLoader from '../components/GlobalLoader';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
    const [loadingState, setLoadingState] = useState({
        isLoading: false,
        type: LOADING_TYPES.FULL,
        message: null
    });

    useEffect(() => {
        const unsubscribe = loadingManager.subscribe((state) => {
            setLoadingState(state);
        });
        return unsubscribe;
    }, []);

    // Manual controls exposed to context consumers if needed
    const showLoading = (type = LOADING_TYPES.FULL, message = null) => loadingManager.start(type, message);
    const hideLoading = (type = LOADING_TYPES.FULL) => loadingManager.stop(type);

    return (
        <LoadingContext.Provider value={{ ...loadingState, showLoading, hideLoading }}>
            {children}
            {/* Removed FULL (fullscreen) mode - always use discrete loader for better UX */}
            {/* Fullscreen modal blocks navigation and interrupts context */}
            {loadingState.isLoading && loadingState.type === LOADING_TYPES.BACKGROUND && (
                <GlobalLoader
                    mode="discrete"
                    size="md"
                    message={loadingState.message}
                />
            )}
        </LoadingContext.Provider>
    );
};
