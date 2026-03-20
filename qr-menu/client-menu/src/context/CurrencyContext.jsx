import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchExchangeRates, formatCurrency, convertCurrency as utilsConvertCurrency, getCurrencySymbol } from '../utils/currencyUtils';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState(localStorage.getItem('preferred_currency') || 'MZN');
    const [restaurant, setRestaurant] = useState(null);
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initial rates load
    useEffect(() => {
        const loadRates = async () => {
            try {
                const r = await fetchExchangeRates();
                setRates(r);
            } catch (error) {
                console.error('Failed to load exchange rates:', error);
            } finally {
                setLoading(false);
            }
        };
        loadRates();
    }, []);

    // Sync with restaurant default currency - priority over user preference if needed,
    // OR just use it as the base for ALL conversions.
    // The requirement says: "Administrator's selection as the single source of truth"
    useEffect(() => {
        if (restaurant?.settings?.currency) {
            const adminCurrency = restaurant.settings.currency;
            if (currency !== adminCurrency) {
                console.log('🔄 Syncing currency with administrator selection:', adminCurrency);
                setCurrency(adminCurrency);
            }
        }
    }, [restaurant]);

    const changeCurrency = useCallback((newCurrency) => {
        setCurrency(newCurrency);
        localStorage.setItem('preferred_currency', newCurrency);
    }, []);

    const convert = useCallback((amount, fromCurrency) => {
        if (!rates || !fromCurrency) return amount;
        return utilsConvertCurrency(amount, fromCurrency, currency, rates);
    }, [rates, currency]);

    const format = useCallback((amount, code = currency) => {
        return formatCurrency(amount, code);
    }, [currency]);

    const convertAndFormat = useCallback((amount, fromCurrency) => {
        if (!amount && amount !== 0) return '';
        const converted = convert(amount, fromCurrency || 'MZN');
        return format(converted);
    }, [convert, format]);

    // LEGACY ALIAS for backward compatibility across the client-menu app
    const formatPrice = convertAndFormat;

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            rates, 
            loading, 
            changeCurrency, 
            formatPrice,
            convert,
            format,
            convertAndFormat,
            getSymbol: () => getCurrencySymbol(currency),
            setRestaurant,
            restaurant 
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
