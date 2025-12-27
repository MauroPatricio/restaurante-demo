/**
 * Common test utilities and helpers
 */

/**
 * Sleep/delay function for async operations
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate random string
 */
export const randomString = (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
};

/**
 * Generate random email
 */
export const randomEmail = () => {
    return `test-${randomString()}@example.com`;
};

/**
 * Generate random phone (Mozambique format)
 */
export const randomPhone = () => {
    const prefixes = ['82', '83', '84', '85', '86', '87'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `+258${prefix}${number}`;
};

/**
 * Validate response structure
 */
export const validateApiResponse = (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    return response.body;
};

/**
 * Extract token from login response
 */
export const extractToken = (loginResponse) => {
    expect(loginResponse.body).toHaveProperty('token');
    return loginResponse.body.token;
};

/**
 * Create authorization header
 */
export const authHeader = (token) => {
    return { Authorization: `Bearer ${token}` };
};

/**
 * Create a test subscription for a restaurant
 */
export const createTestSubscription = async (restaurantId) => {
    const Subscription = (await import('../../src/models/Subscription.js')).default;

    const subscription = await Subscription.create({
        restaurant: restaurantId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        amount: 10000,
        currency: 'MT'
    });

    return subscription;
};

/**
 * Update restaurant with subscription
 */
export const updateRestaurantSubscription = async (restaurantId, subscriptionId) => {
    const Restaurant = (await import('../../src/models/Restaurant.js')).default;

    await Restaurant.findByIdAndUpdate(restaurantId, {
        subscription: subscriptionId
    });
};
