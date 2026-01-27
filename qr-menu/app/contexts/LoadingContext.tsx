import React, { createContext, useContext, useState, ReactNode } from 'react';
import GlobalLoader from '../components/GlobalLoader';

interface LoadingContextType {
    isLoading: boolean;
    message: string | null;
    showLoading: (message?: string) => void;
    hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = (): LoadingContextType => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};

interface LoadingProviderProps {
    children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const showLoading = (customMessage?: string) => {
        setMessage(customMessage || null);
        setIsLoading(true);
    };

    const hideLoading = () => {
        setIsLoading(false);
        setMessage(null);
    };

    return (
        <LoadingContext.Provider value={{ isLoading, message, showLoading, hideLoading }}>
            {children}
            {isLoading && (
                <GlobalLoader
                    mode="fullscreen"
                    size="large"
                    message={message || undefined}
                />
            )}
        </LoadingContext.Provider>
    );
};
