import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchExchangeRates, convertCurrency, formatCurrency } from '../utils/currencyUtils';

const CurrencyContext = createContext(null);

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export const CurrencyProvider = ({ children }) => {
    const { user } = useAuth();
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);

    // Get the base currency defined in restaurant settings
    const systemCurrency = user?.restaurant?.settings?.currency || 'MZN';

    const loadRates = useCallback(async (force = false) => {
        try {
            const newRates = await fetchExchangeRates(force);
            setRates(newRates);
        } catch (error) {
            console.error('Failed to load exchange rates in context:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRates();
    }, [loadRates]);

    /**
     * Convert an amount from one currency to the system's base currency
     */
    const convert = useCallback((amount, fromCurrency) => {
        if (!amount) return 0;
        const from = fromCurrency || 'MZN';
        return convertCurrency(amount, from, systemCurrency, rates);
    }, [rates, systemCurrency]);

    /**
     * Format an amount in the system's base currency
     */
    const format = useCallback((amount) => {
        return formatCurrency(amount, systemCurrency);
    }, [systemCurrency]);

    /**
     * Convenience function to convert and then format
     */
    const convertAndFormat = useCallback((amount, fromCurrency) => {
        const converted = convert(amount, fromCurrency);
        return format(converted);
    }, [convert, format]);

    const value = {
        rates,
        loading,
        systemCurrency,
        convert,
        format,
        convertAndFormat,
        refreshRates: () => loadRates(true)
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};
