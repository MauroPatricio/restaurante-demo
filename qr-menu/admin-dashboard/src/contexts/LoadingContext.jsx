import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadingManager, LOADING_TYPES } from '../utils/loadingManager';
import LoadingOverlay from '../components/LoadingOverlay';
import DiscreteLoader from '../components/DiscreteLoader';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
    const [loadingState, setLoadingState] = useState({
        isLoading: false,
        type: LOADING_TYPES.FULL
    });

    useEffect(() => {
        const unsubscribe = loadingManager.subscribe((state) => {
            setLoadingState(state);
        });
        return unsubscribe;
    }, []);

    // Manual controls exposed to context consumers if needed
    const showLoading = (type = LOADING_TYPES.FULL) => loadingManager.start(type);
    const hideLoading = (type = LOADING_TYPES.FULL) => loadingManager.stop(type);

    return (
        <LoadingContext.Provider value={{ ...loadingState, showLoading, hideLoading }}>
            {children}
            {loadingState.isLoading && loadingState.type === LOADING_TYPES.FULL && <LoadingOverlay />}
            {loadingState.isLoading && loadingState.type === LOADING_TYPES.BACKGROUND && <DiscreteLoader />}
        </LoadingContext.Provider>
    );
};
