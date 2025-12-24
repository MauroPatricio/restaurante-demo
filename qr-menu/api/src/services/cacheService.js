// Simple in-memory cache service
// For production, consider using Redis

class CacheService {
    constructor() {
        this.cache = new Map();
        this.ttls = new Map();
    }

    /**
     * Set a value in cache with TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
     */
    set(key, value, ttlSeconds = 300) {
        this.cache.set(key, value);

        // Clear existing timeout if any
        if (this.ttls.has(key)) {
            clearTimeout(this.ttls.get(key));
        }

        // Set new timeout
        const timeout = setTimeout(() => {
            this.cache.delete(key);
            this.ttls.delete(key);
        }, ttlSeconds * 1000);

        this.ttls.set(key, timeout);
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        return this.cache.get(key) || null;
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Delete a specific key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        if (this.ttls.has(key)) {
            clearTimeout(this.ttls.get(key));
            this.ttls.delete(key);
        }
        this.cache.delete(key);
    }

    /**
     * Delete all keys matching a pattern
     * @param {string} pattern - Pattern to match (e.g., 'menu:*')
     */
    deletePattern(pattern) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        for (const timeout of this.ttls.values()) {
            clearTimeout(timeout);
        }
        this.cache.clear();
        this.ttls.clear();
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;
