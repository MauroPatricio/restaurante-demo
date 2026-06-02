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
        const rates = response.data?.rates;
        
        if (!rates) {
            throw new Error('Exchange rates not found in response');
        }
        
        // Normalize: Ensure both MZN and MT exist if one does
        if (rates.MZN && !rates.MT) rates.MT = rates.MZN;
        if (rates.MT && !rates.MZN) rates.MZN = rates.MT;
        
        exchangeRates = rates;
        lastFetched = now;
        return exchangeRates;
    } catch (error) {
        console.warn('Unable to load exchange rates from server, using local fallback values. (Handled gracefully):', error.message || error);
        // Fallback rates if API fails
        return {
            USD: 1,
            MZN: 64,
            MT: 64, // Added MT fallback
            EUR: 0.92,
            ZAR: 18.5,
            GBP: 0.79
        };
    }
};

/**
 * Convert value from one currency to another
 */
export const convertCurrency = (amount, from, to, rates) => {
    if (!amount) return 0;
    if (from === to) return amount;
    // Normalize case and match both MZN/MT
    const fromKey = (from === 'MT' || from === 'MZN') ? (rates.MZN ? 'MZN' : 'MT') : from;
    const toKey = (to === 'MT' || to === 'MZN') ? (rates.MZN ? 'MZN' : 'MT') : to;

    if (!rates[fromKey] || !rates[toKey]) {
        // Last resort: if we are going from MT/MZN to USD, use a hardcoded 64 rate if missing
        if ((fromKey === 'MZN' || fromKey === 'MT') && toKey === 'USD') return amount / 64;
        return amount;
    }
    
    const amountInBase = amount / rates[fromKey];
    return amountInBase * rates[toKey];
};

/**
 * Format currency value professionally
 */
export const formatCurrency = (amount, currencyCode = 'USD', locale = 'pt-MZ') => {
    const numericAmount = Number(amount) || 0;
    const symbol = getCurrencySymbol(currencyCode);
    
    try {
        // We use a custom approach for MZN/MT to ensure "100.00 MT" style
        if (currencyCode === 'MZN' || currencyCode === 'MT') {
            return `${numericAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2
        }).format(numericAmount);
    } catch (e) {
        // Fallback for any issues
        const symbol = getCurrencySymbol(currencyCode);
        
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
export const getCurrencySymbol = (currencyCode = 'USD') => {
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
