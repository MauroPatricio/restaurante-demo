import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchExchangeRates, formatCurrency, convertCurrency } from '../utils/currencyUtils';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState(localStorage.getItem('preferred_currency') || 'MZN');
    const [restaurant, setRestaurant] = useState(null);
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);

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

    // Sync with restaurant default currency - FORCE it if settings change
    useEffect(() => {
        if (restaurant?.settings?.currency) {
            console.log('🔄 Syncing currency with restaurant default:', restaurant.settings.currency);
            setCurrency(restaurant.settings.currency);
        }
    }, [restaurant]);

    const changeCurrency = (newCurrency) => {
        setCurrency(newCurrency);
        localStorage.setItem('preferred_currency', newCurrency);
    };

    const formatPrice = (amount, fromCode) => {
        const targetCurrency = currency;
        
        // If fromCode is specified and different from our target, try to convert
        let finalAmount = amount;
        if (fromCode && fromCode !== targetCurrency && rates) {
            finalAmount = convertCurrency(amount, fromCode, targetCurrency, rates);
        }

        return formatCurrency(
            finalAmount, 
            targetCurrency, 
            undefined, 
            restaurant?.settings?.customCurrencies || []
        );
    };

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            rates, 
            loading, 
            changeCurrency, 
            formatPrice,
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
