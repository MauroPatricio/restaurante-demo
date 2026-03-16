import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchExchangeRates, formatCurrency } from '../utils/currencyUtils';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState(localStorage.getItem('preferred_currency') || 'MZN');
    const [restaurantSettings, setRestaurantSettings] = useState(null);
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

    const changeCurrency = (newCurrency) => {
        setCurrency(newCurrency);
        localStorage.setItem('preferred_currency', newCurrency);
    };

    const formatPrice = (amount, code) => {
        const currentCurrency = code || currency;
        return formatCurrency(
            amount, 
            currentCurrency, 
            undefined, 
            restaurantSettings?.customCurrencies || []
        );
    };

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            rates, 
            loading, 
            changeCurrency, 
            formatPrice,
            setRestaurantSettings,
            restaurantSettings 
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
