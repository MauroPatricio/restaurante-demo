import axios from 'axios';

// Cache for exchange rates
let exchangeRates: any = null;
let lastFetched: number | null = null;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Fetch latest exchange rates from backend
 */
export const fetchExchangeRates = async (baseUrl: string, force = false) => {
    const now = Date.now();
    if (!force && exchangeRates && lastFetched && (now - lastFetched < CACHE_DURATION)) {
        return exchangeRates;
    }

    try {
        const response = await axios.get(`${baseUrl}/currency/rates`);
        exchangeRates = response.data.rates;
        lastFetched = now;
        return exchangeRates;
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates (USD base) if API fails
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
 * Get currency symbol mapping
 */
export const getCurrencySymbol = (currencyCode = 'USD') => {
    const symbolMap: any = {
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
export const formatCurrency = (amount: number, currencyCode = 'USD', locale = 'pt-MZ') => {
    const numericAmount = Number(amount) || 0;
    const code = currencyCode === 'MT' ? 'MZN' : currencyCode;
    const symbol = getCurrencySymbol(code);

    // Simple formatting for React Native (Intl might not be fully supported in all environments without polyfills)
    // For MZN/MT we want "100.00 MT"
    // For others, we try to use a simple approach if Intl is missing
    
    const formattedNumber = numericAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');

    if (['USD', 'GBP', 'BRL'].includes(code)) {
        return `${symbol} ${formattedNumber}`;
    }
    return `${formattedNumber} ${symbol}`;
};

/**
 * Convert value from one currency to another
 */
export const convertCurrency = (amount: number, from: string, to: string, rates: any) => {
    if (!amount) return 0;
    if (from === to) return amount;
    
    // Normalize legacy 'MT' to 'MZN'
    const normalize = (c: string) => (c === 'MT' ? 'MZN' : c);
    const fromCode = normalize(from);
    const toCode = normalize(to);

    if (!rates || !rates[fromCode] || !rates[toCode]) return amount;
    
    const amountInBase = amount / rates[fromCode];
    return amountInBase * rates[toCode];
};
