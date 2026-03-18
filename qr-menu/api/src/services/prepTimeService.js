import Order from '../models/Order.js';

/**
 * Calculates dynamic estimated preparation time based on current kitchen load.
 * @param {number} basePrepTime - Base preparation time for the items (in minutes).
 * @param {string} restaurantId - The restaurant's ID to check active orders.
 * @returns {Promise<{minTime: number, maxTime: number}>}
 */
export const calculateDynamicPrepTime = async (basePrepTime, restaurantId) => {
    try {
        // Count orders that are currently being prepared or are confirmed but not yet ready
        const activeOrdersCount = await Order.countDocuments({
            restaurant: restaurantId,
            status: { $in: ['confirmed', 'preparing', 'almost_ready'] }
        });

        // Simple algorithm: 
        // Base time + (active orders factor * 3-5 mins buffer)
        // Let's assume kitchen capacity is around 5 orders at once for standard base time.
        const capacity = 5;
        const loadFactor = Math.max(0, activeOrdersCount - capacity);
        
        // Add 3 minutes for every order over capacity
        const extraMinutes = loadFactor * 3;
        
        const minTime = basePrepTime + extraMinutes;
        const maxTime = minTime + 5; // Give a 5-minute range

        return { minTime, maxTime };
    } catch (error) {
        console.error('Error calculating dynamic prep time:', error);
        return { minTime: basePrepTime, maxTime: basePrepTime + 10 };
    }
};
