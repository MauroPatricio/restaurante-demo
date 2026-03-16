import axios from 'axios';

class CurrencyService {
    constructor() {
        this.cache = {
            rates: null,
            lastFetched: null
        };
        this.BASE_CURRENCY = 'MZN';
        this.API_URL = `https://open.er-api.com/v6/latest/${this.BASE_CURRENCY}`;
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    }

    async getRates() {
        const now = Date.now();
        if (this.cache.rates && this.cache.lastFetched && (now - this.cache.lastFetched < this.CACHE_DURATION)) {
            return this.cache.rates;
        }

        try {
            console.log(`Fetching exchange rates for ${this.BASE_CURRENCY}...`);
            const response = await axios.get(this.API_URL);
            if (response.data && response.data.result === 'success') {
                this.cache.rates = response.data.rates;
                this.cache.lastFetched = now;
                return this.cache.rates;
            }
            throw new Error('Failed to fetch exchange rates');
        } catch (error) {
            console.error('Exchange Rate API Error:', error.message);
            // Return cached rates even if expired if API fails, or fallback rates
            if (this.cache.rates) return this.cache.rates;

            // Absolute fallbacks if everything fails
            return {
                MZN: 1,
                USD: 0.0156,
                EUR: 0.0143,
                ZAR: 0.28,
                GBP: 0.0123
            };
        }
    }

    async convert(amount, from, to) {
        const rates = await this.getRates();
        if (!rates[from] || !rates[to]) {
            throw new Error(`Unsupported currency conversion: ${from} to ${to}`);
        }

        // Convert amount to BASE_CURRENCY (MZN) first, then to target currency
        const amountInBase = amount / rates[from];
        return amountInBase * rates[to];
    }

    async getSupportedCurrencies() {
        try {
            const rates = await this.getRates();
            return Object.keys(rates).sort();
        } catch (error) {
            // Comprehensive fallback list of common currencies
            return [
                'MZN', 'USD', 'EUR', 'ZAR', 'GBP', 'BRL', 'MXN', 'CAD', 'AUD', 'JPY', 
                'CNY', 'INR', 'AED', 'AOA', 'CVE', 'STN', 'CHF', 'DKK', 'NOK', 'SEK'
            ].sort();
        }
    }
}

export default new CurrencyService();
