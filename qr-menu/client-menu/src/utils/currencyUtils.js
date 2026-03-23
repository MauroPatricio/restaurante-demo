import axios from 'axios';
import { API_URL } from '../config/api';

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
        const response = await axios.get(`${API_URL}/currency/rates`);
        exchangeRates = response.data.rates;
        lastFetched = now;
        return exchangeRates;
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates if API fails (USD base)
        return {
            USD: 1,
            MZN: 64,
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
    
    // Normalize legacy 'MT' to 'MZN'
    const normalize = (c) => (c === 'MT' ? 'MZN' : c);
    const fromCode = normalize(from);
    const toCode = normalize(to);

    if (!rates || !rates[fromCode] || !rates[toCode]) return amount;
    
    // amount / rates[fromCode] gives value in USD (base)
    // then multiply by rates[toCode] to get value in target
    const amountInBase = amount / rates[fromCode];
    return amountInBase * rates[toCode];
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

/**
 * Format currency value professionally
 */
export const formatCurrency = (amount, currencyCode = 'USD', locale = 'pt-MZ') => {
    const numericAmount = Number(amount) || 0;
    const code = currencyCode === 'MT' ? 'MZN' : currencyCode;
    
    try {
        const symbol = getCurrencySymbol(code);
        
        // We use a custom approach for MZN/MT or if the symbol is the same as the code
        if (code === 'MZN' || symbol === code) {
            return `${numericAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 2
        }).format(numericAmount);
    } catch (e) {
        // Fallback for any issues
        const symbol = getCurrencySymbol(code);
        
        // Decide placement: common for MZN/EUR/ZAR to be after, USD before
        if (['USD', 'GBP', 'BRL'].includes(code)) {
            return `${symbol} ${numericAmount.toFixed(2)}`;
        }
        return `${numericAmount.toFixed(2)} ${symbol}`;
    }
};
