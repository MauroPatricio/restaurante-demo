import axios from 'axios';

// Cache for exchange rates
let exchangeRates = null;
let lastFetched = null;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Fetch latest exchange rates from backend
 */
export const fetchExchangeRates = async (force = false) => {
    const now = Date.now();
    if (!force && exchangeRates && lastFetched && (now - lastFetched < CACHE_DURATION)) {
        return exchangeRates;
    }

    try {
        // We use the base API instance if possible, or direct axios if not initialized
        // For simplicity in this utility, we'll try to get it from a relative path or env
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await axios.get(`${apiUrl}/currency/rates`);
        exchangeRates = response.data.rates;
        lastFetched = now;
        return exchangeRates;
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates if API fails
        return {
            MZN: 1,
            USD: 0.0156,
            EUR: 0.0143,
            ZAR: 0.28,
            GBP: 0.0123
        };
    }
};

/**
 * Convert value from one currency to another
 */
export const convertCurrency = (amount, from, to, rates) => {
    if (!amount) return 0;
    if (from === to) return amount;
    if (!rates || !rates[from] || !rates[to]) return amount;
    
    // Always convert to base (MZN) first if rates are relative to base
    // Most rates from our API are { MZN: 1, USD: 0.015, ... } 
    // to go from USD to EUR: (amount / rates.USD) * rates.EUR
    const amountInBase = amount / rates[from];
    return amountInBase * rates[to];
};

/**
 * Format currency value professionally
 */
export const formatCurrency = (amount, currencyCode = 'MZN', locale = 'pt-MZ') => {
    const numericAmount = Number(amount) || 0;
    
    try {
        // We use a custom approach for MZN/MT to ensure "100.00 MT" style
        if (currencyCode === 'MZN' || currencyCode === 'MT') {
            return `${numericAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2
        }).format(numericAmount);
    } catch (e) {
        // Fallback for any issues
        const symbols = {
            USD: '$', EUR: '€', ZAR: 'R', GBP: '£', BRL: 'R$', MZN: 'MT', MT: 'MT'
        };
        const symbol = symbols[currencyCode] || currencyCode;
        
        // Decide placement: common for MZN/EUR/ZAR to be after, USD before
        if (['USD', 'GBP', 'BRL'].includes(currencyCode)) {
            return `${symbol} ${numericAmount.toFixed(2)}`;
        }
        return `${numericAmount.toFixed(2)} ${symbol}`;
    }
};

/**
 * Get currency symbol mapping
 */
export const getCurrencySymbol = (currencyCode = 'MZN') => {
    const symbolMap = {
        MZN: 'MT',
        MT: 'MT',
        USD: '$',
        EUR: '€',
        ZAR: 'R',
        GBP: '£',
        BRL: 'R$',
        MXN: '$',
        MOP: 'P',
        HKD: 'HK$'
    };
    return symbolMap[currencyCode] || currencyCode;
};
