import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadingManager } from '../utils/loadingManager';
import GlobalLoader from '../components/GlobalLoader';
import { AnimatePresence } from 'framer-motion';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
    const [loadingState, setLoadingState] = useState({
        isLoading: false,
        message: null
    });

    useEffect(() => {
        const unsubscribe = loadingManager.subscribe((state) => {
            setLoadingState(state);
        });
        return unsubscribe;
    }, []);

    // Manual controls exposed to context consumers if needed
    const showLoading = (message = null) => loadingManager.start(message);
    const hideLoading = () => loadingManager.stop();

    return (
        <LoadingContext.Provider value={{ ...loadingState, showLoading, hideLoading }}>
            {children}
            <AnimatePresence>
                {loadingState.isLoading && (
                    <GlobalLoader
                        key="global-loader"
                        mode="fullscreen"
                        size="lg"
                        message={loadingState.message}
                    />
                )}
            </AnimatePresence>
        </LoadingContext.Provider>
    );
};
