/**
 * Subscription Status Helper Utilities
 * Provides functions for calculating global subscription status across multiple restaurants
 */

/**
 * Status priority hierarchy (higher number = more critical)
 */
const STATUS_PRIORITY = {
    expired: 5,
    suspended: 4,
    cancelled: 3,
    trial: 2,
    active: 1
};

/**
 * Calculate the global subscription status from an array of subscriptions
 * Returns the most critical status based on priority hierarchy
 * 
 * @param {Array<Object>} subscriptions - Array of subscription objects with status field
 * @returns {string} The global status (expired, suspended, cancelled, trial, or active)
 */
export const calculateGlobalStatus = (subscriptions) => {
    if (!subscriptions || subscriptions.length === 0) {
        return 'suspended'; // Default to suspended if no subscriptions
    }

    let mostCriticalStatus = 'active';
    let highestPriority = 0;

    subscriptions.forEach(sub => {
        const status = sub.status || 'suspended';
        const priority = STATUS_PRIORITY[status] || 0;

        if (priority > highestPriority) {
            highestPriority = priority;
            mostCriticalStatus = status;
        }
    });

    return mostCriticalStatus;
};

/**
 * Find the restaurant with the most critical subscription status
 * 
 * @param {Array<Object>} subscriptions - Array of subscription objects with restaurant field
 * @returns {Object|null} The subscription object with the most critical status
 */
export const findCriticalSubscription = (subscriptions) => {
    if (!subscriptions || subscriptions.length === 0) {
        return null;
    }

    let criticalSubscription = subscriptions[0];
    let highestPriority = STATUS_PRIORITY[subscriptions[0].status] || 0;

    subscriptions.forEach(sub => {
        const priority = STATUS_PRIORITY[sub.status] || 0;
        if (priority > highestPriority) {
            highestPriority = priority;
            criticalSubscription = sub;
        }
    });

    return criticalSubscription;
};

/**
 * Check if a global status requires action (renewal/reactivation)
 * 
 * @param {string} globalStatus - The global subscription status
 * @returns {boolean} True if action is required
 */
export const requiresAction = (globalStatus) => {
    return ['expired', 'suspended', 'cancelled'].includes(globalStatus);
};

export default {
    calculateGlobalStatus,
    findCriticalSubscription,
    requiresAction,
    STATUS_PRIORITY
};
