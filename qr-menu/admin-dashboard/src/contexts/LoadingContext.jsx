import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadingManager, LOADING_TYPES } from '../utils/loadingManager';
import GlobalLoader from '../components/GlobalLoader';
import { AnimatePresence } from 'framer-motion';

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
            <AnimatePresence>
                {loadingState.isLoading && loadingState.type === LOADING_TYPES.BACKGROUND && (
                    <GlobalLoader
                        key="admin-background-loader"
                        mode="discrete"
                        size="md"
                        message={loadingState.message}
                    />
                )}
            </AnimatePresence>
        </LoadingContext.Provider>
    );
};
