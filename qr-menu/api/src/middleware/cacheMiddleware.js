import cacheService from '../services/cacheService.js';

export const cacheMiddleware = (durationSeconds = 300) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create a unique key based on URL and restaurant ID if available
        // User roles shouldn't generally see cached data for admin routes,
        // so this is best used on public routes or purely read-only lists
        const key = `cache:${req.originalUrl || req.url}`;
        
        const cachedBody = cacheService.get(key);
        if (cachedBody) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedBody);
        }

        res.setHeader('X-Cache', 'MISS');

        // Intercept res.json to cache the response
        const originalJson = res.json;
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cacheService.set(key, body, durationSeconds);
            }
            return originalJson.call(this, body);
        };

        next();
    };
};

export default cacheMiddleware;

