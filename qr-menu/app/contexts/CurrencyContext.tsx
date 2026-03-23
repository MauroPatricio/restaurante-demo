import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchExchangeRates, formatCurrency, convertCurrency as utilsConvertCurrency, getCurrencySymbol } from '../utils/currencyUtils';

const CurrencyContext = createContext<any>(null);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
    const [currency, setCurrency] = useState('MZN'); // Initial fallback
    const [rates, setRates] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Initial rates load
    useEffect(() => {
        const loadRates = async () => {
            try {
                const r = await fetchExchangeRates('http://localhost:4000/api'); // Base URL should be dynamic
                setRates(r);
            } catch (error) {
                console.error('Failed to load exchange rates:', error);
            } finally {
                setLoading(false);
            }
        };
        loadRates();
    }, []);

    const changeCurrency = useCallback((newCurrency: string) => {
        setCurrency(newCurrency);
    }, []);

    const convert = useCallback((amount: number, fromCurrency: string) => {
        if (!rates || !fromCurrency) return amount;
        return utilsConvertCurrency(amount, fromCurrency, currency, rates);
    }, [rates, currency]);

    const format = useCallback((amount: number, code = currency) => {
        return formatCurrency(amount, code);
    }, [currency]);

    const convertAndFormat = useCallback((amount: number, fromCurrency?: string) => {
        if (!amount && amount !== 0) return '';
        const converted = convert(amount, fromCurrency || currency);
        return format(converted);
    }, [convert, format, currency]);

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            rates, 
            loading, 
            changeCurrency, 
            format: formatAndConvert, // Legacy alias if needed
            convert,
            format,
            convertAndFormat,
            getSymbol: () => getCurrencySymbol(currency),
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

// Alias for convenience
const formatAndConvert = (amount: number, currency: string) => formatCurrency(amount, currency);

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
