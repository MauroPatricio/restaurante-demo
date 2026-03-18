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
    if (!rates || !rates[from] || !rates[to]) return amount;
    const amountInBase = amount / rates[from];
    return amountInBase * rates[to];
};

/**
 * Format currency value according to locale
 */
export const formatCurrency = (amount, currencyCode = 'MZN', locale = 'pt-MZ') => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2
        }).format(amount);
    } catch (e) {
        // Fallback formatting
        const symbolMap = {
            MZN: 'MZN', // Default to ISO code for consistency
            MT: 'MZN',
            USD: '$',
            EUR: '€',
            ZAR: 'R',
            GBP: '£'
        };
        const symbol = symbolMap[currencyCode] || currencyCode;
        return `${symbol} ${amount.toFixed(2)}`;
    }
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currencyCode = 'MZN') => {
    const symbolMap = {
        MZN: 'MZN',
        MT: 'MZN',
        USD: '$',
        EUR: '€',
        ZAR: 'R',
        GBP: '£'
    };
    return symbolMap[currencyCode] || currencyCode;
};
