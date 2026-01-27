import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import User from '../models/User.js';

// ============================================================================
// 🏆 HELPER: Calculate Top Waiter based on Performance Score
// ============================================================================
export async function calculateTopWaiter(restaurantIds, restaurants) {
    try {
        // Get all orders with assigned waiters
        const waiterStats = await Order.aggregate([
            {
                $match: {
                    restaurant: { $in: restaurantIds },
                    status: { $ne: 'cancelled' },
                    createdByWaiter: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        waiter: '$createdByWaiter',
                        restaurant: '$restaurant'
                    },
                    ordersCount: { $count: {} },
                    totalRevenue: { $sum: '$total' }
                }
            },
            { $sort: { ordersCount: -1 } },
            { $limit: 10 } // Top 10 to calculate score
        ]);

        if (waiterStats.length === 0) return null;

        // Populate waiter details
        const waiterIds = waiterStats.map(w => w._id.waiter);
        const waiters = await User.find({ _id: { $in: waiterIds } }).select('name email');

        // Calculate performance score for each waiter
        const maxOrders = Math.max(...waiterStats.map(w => w.ordersCount));

        const scoredWaiters = waiterStats.map(stat => {
            const waiter = waiters.find(w => w._id.toString() === stat._id.waiter.toString());
            const restaurant = restaurants.find(r => r._id.toString() === stat._id.restaurant.toString());

            // Score calculation (simplified - 100% based on orders for now)
            // Can be enhanced with response time, customer ratings, etc.
            const score = Math.round((stat.ordersCount / maxOrders) * 100);

            return {
                name: waiter?.name || 'Unknown',
                score,
                ordersCount: stat.ordersCount,
                revenue: stat.totalRevenue,
                restaurant: restaurant?.name || 'Unknown'
            };
        });

        // Return top scored waiter
        return scoredWaiters.sort((a, b) => b.score - a.score)[0] || null;

    } catch (error) {
        console.error('Calculate top waiter error:', error);
        return null;
    }
}

// ============================================================================
// 🍽️ HELPER: Calculate Top Dish based on Quantity Sold
// ============================================================================
export async function calculateTopDish(restaurantIds, restaurants) {
    try {
        const dishStats = await Order.aggregate([
            {
                $match: {
                    restaurant: { $in: restaurantIds },
                    status: { $ne: 'cancelled' }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: {
                        item: '$items.item',
                        restaurant: '$restaurant'
                    },
                    quantity: { $sum: '$items.qty' },
                    revenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 1 } // Top dish
        ]);

        if (dishStats.length === 0) return null;

        const topStat = dishStats[0];

        // Get menu item details
        const menuItem = await MenuItem.findById(topStat._id.item).select('name');
        const restaurant = restaurants.find(r => r._id.toString() === topStat._id.restaurant.toString());

        return {
            name: menuItem?.name || 'Unknown Dish',
            quantity: topStat.quantity,
            revenue: topStat.revenue,
            restaurant: restaurant?.name || 'Unknown'
        };

    } catch (error) {
        console.error('Calculate top dish error:', error);
        return null;
    }
}

// ============================================================================
// ⚡ HELPER: Calculate Fastest Dish based on Average Prep Time  
// ============================================================================
export async function calculateFastestDish(restaurantIds, restaurants) {
    try {
        const prepTimeStats = await Order.aggregate([
            {
                $match: {
                    restaurant: { $in: restaurantIds },
                    status: { $in: ['ready', 'completed'] },
                    actualReadyTime: { $exists: true },
                    createdAt: { $exists: true }
                }
            },
            { $unwind: '$items' },
            {
                $project: {
                    item: '$items.item',
                    restaurant: '$restaurant',
                    prepTimeMinutes: {
                        $divide: [
                            { $subtract: ['$actualReadyTime', '$createdAt'] },
                            60000 // ms to minutes
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        item: '$item',
                        restaurant: '$restaurant'
                    },
                    avgTime: { $avg: '$prepTimeMinutes' },
                    orderCount: { $count: {} }
                }
            },
            // Filter: only dishes with at least 3 orders for reliable average
            { $match: { orderCount: { $gte: 3 } } },
            { $sort: { avgTime: 1 } }, // Ascending - fastest first
            { $limit: 1 }
        ]);

        if (prepTimeStats.length === 0) return null;

        const topStat = prepTimeStats[0];

        // Get menu item details
        const menuItem = await MenuItem.findById(topStat._id.item).select('name');
        const restaurant = restaurants.find(r => r._id.toString() === topStat._id.restaurant.toString());

        return {
            name: menuItem?.name || 'Unknown Dish',
            avgTime: Math.round(topStat.avgTime),
            orderCount: topStat.orderCount,
            restaurant: restaurant?.name || 'Unknown'
        };

    } catch (error) {
        console.error('Calculate fastest dish error:', error);
        return null;
    }
}

