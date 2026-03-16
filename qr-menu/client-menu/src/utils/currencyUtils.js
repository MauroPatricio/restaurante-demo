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
    // Normalize legacy 'MT' to 'MZN'
    const normalize = (c) => (c === 'MT' ? 'MZN' : c);
    const fromCode = normalize(from);
    const toCode = normalize(to);

    if (!rates || !rates[fromCode] || !rates[toCode]) return amount;
    const amountInBase = amount / rates[fromCode];
    return amountInBase * rates[toCode];
};

/**
 * Format currency value according to locale
 */
export const formatCurrency = (amount, currencyCode = 'MZN', locale = 'pt-MZ', customCurrencies = []) => {
    try {
        // Find custom currency if it exists
        const custom = customCurrencies.find(c => c.code === currencyCode);
        if (custom) {
            return `${custom.symbol} ${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        // Handle MZN separately to keep MT symbol
        if (currencyCode === 'MZN' || currencyCode === 'MT') {
            return `${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2
        }).format(amount);
    } catch (e) {
        const symbolMap = {
            MZN: 'MT',
            MT: 'MT',
            USD: '$',
            EUR: '€',
            ZAR: 'R',
            GBP: '£',
            BRL: 'R$',
            MXN: 'Mex$'
        };
        const symbol = symbolMap[currencyCode] || currencyCode;
        return `${symbol} ${amount.toFixed(2)}`;
    }
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currencyCode = 'MZN', customCurrencies = []) => {
    const custom = customCurrencies.find(c => c.code === currencyCode);
    if (custom) return custom.symbol;

    const symbolMap = {
        MZN: 'MT',
        MT: 'MT',
        USD: '$',
        EUR: '€',
        ZAR: 'R',
        GBP: '£',
        BRL: 'R$',
        MXN: 'Mex$'
    };
    return symbolMap[currencyCode] || currencyCode;
};
