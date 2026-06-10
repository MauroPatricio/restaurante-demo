import NodeCache from 'node-cache';

// Simple in-memory cache service using node-cache
// node-cache is more robust than manual Maps with timeouts
class CacheService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
    }

    /**
     * Set a value in cache with TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
     */
    set(key, value, ttlSeconds = 300) {
        this.cache.set(key, value, ttlSeconds);
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        const val = this.cache.get(key);
        return val === undefined ? null : val;
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
        this.cache.del(key);
    }

    /**
     * Delete all keys matching a pattern
     * @param {string} pattern - Pattern to match (e.g., 'menu:*')
     */
    deletePattern(pattern) {
        const keys = this.cache.keys();
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        const keysToDelete = keys.filter(k => regex.test(k));
        if (keysToDelete.length > 0) {
            this.cache.del(keysToDelete);
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.flushAll();
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getStats() {
        return this.cache.getStats();
    }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;
