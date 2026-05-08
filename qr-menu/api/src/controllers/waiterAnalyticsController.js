import Order from '../models/Order.js';
import WaiterCall from '../models/WaiterCall.js';
import User from '../models/User.js';
import UserRestaurantRole from '../models/UserRestaurantRole.js';
import Role from '../models/Role.js';
import mongoose from 'mongoose';
import { subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Helper: Get all waiter IDs for a restaurant using UserRestaurantRole
 * FIX: Old code queried User.role which doesn't exist on the User model.
 *       Roles are stored in UserRestaurantRole collection.
 */
async function getWaiterIdsForRestaurant(restaurantId) {
    // Find all roles named "Waiter" (case-insensitive variants)
    const waiterRoles = await Role.find({
        name: { $in: ['Waiter', 'Garçom', 'Garcom', 'Atendente', 'waiter'] }
    }).select('_id');

    const waiterRoleIds = waiterRoles.map(r => r._id);

    // Find all UserRestaurantRole entries for this restaurant with waiter roles
    const userRoles = await UserRestaurantRole.find({
        restaurant: restaurantId,
        role: { $in: waiterRoleIds },
        active: true
    }).populate('user', '_id name email active avatar');

    return userRoles
        .filter(urr => urr.user && urr.user._id) // filter nulls
        .map(urr => ({
            _id: urr.user._id,
            name: urr.user.name,
            email: urr.user.email,
            active: urr.user.active,
            avatar: urr.user.avatar
        }));
}

/**
 * Build date filter from query params
 */
function buildDateFilter(startDate, endDate, period = '30d') {
    if (startDate && endDate) {
        return {
            createdAt: {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            }
        };
    }
    const days = parseInt(period.replace('d', '')) || 30;
    return {
        createdAt: { $gte: subDays(new Date(), days) }
    };
}

/**
 * Get all waiters with summary performance metrics
 * GET /api/analytics/:restaurantId/waiters
 */
export const getAllWaiterAnalytics = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { startDate, endDate, period = '30d' } = req.query;

        const dateFilter = buildDateFilter(startDate, endDate, period);

        // 1. Get all waiters for this restaurant via UserRestaurantRole (FIXED)
        const waiters = await getWaiterIdsForRestaurant(restaurantId);
        const waiterIds = waiters.map(w => w._id);

        if (waiterIds.length === 0) {
            return res.json({
                period: startDate ? `${startDate} to ${endDate}` : `Last ${period}`,
                waiters: [],
                summary: {
                    totalWaiters: 0,
                    activeWaiters: 0,
                    totalOrders: 0,
                    avgEfficiency: 0
                }
            });
        }

        // 2. Aggregate Order Stats per Waiter
        const orderStats = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: { $in: waiterIds },
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$createdByWaiter',
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$total' },
                    totalTables: { $addToSet: '$table' },
                    totalDishes: { $sum: { $sum: '$items.qty' } },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    }
                }
            }
        ]);

        // 3. Aggregate Waiter Call Stats
        const callStats = await WaiterCall.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    resolvedBy: { $in: waiterIds },
                    status: 'resolved',
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$resolvedBy',
                    callsResolved: { $sum: 1 },
                    avgResponseTime: {
                        $avg: {
                            $divide: [
                                { $subtract: ['$resolvedAt', '$createdAt'] },
                                1000 * 60 // Convert to minutes
                            ]
                        }
                    }
                }
            }
        ]);

        // 4. Calculate Average Service Time (session start → order creation)
        const serviceTimeStats = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: { $in: waiterIds },
                    tableSession: { $exists: true },
                    ...dateFilter
                }
            },
            {
                $lookup: {
                    from: 'tablesessions',
                    localField: 'tableSession',
                    foreignField: '_id',
                    as: 'sessionInfo'
                }
            },
            { $unwind: { path: '$sessionInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    createdByWaiter: 1,
                    serviceTime: {
                        $cond: {
                            if: { $and: ['$sessionInfo.startedAt', '$createdAt'] },
                            then: {
                                $divide: [
                                    { $subtract: ['$createdAt', '$sessionInfo.startedAt'] },
                                    1000 * 60
                                ]
                            },
                            else: null
                        }
                    }
                }
            },
            {
                $match: { serviceTime: { $ne: null, $gte: 0, $lte: 120 } }
            },
            {
                $group: {
                    _id: '$createdByWaiter',
                    avgServiceTime: { $avg: '$serviceTime' }
                }
            }
        ]);

        // 5. Calculate Average Order Completion Time
        const completionTimeStats = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: { $in: waiterIds },
                    actualReadyTime: { $exists: true },
                    ...dateFilter
                }
            },
            {
                $project: {
                    createdByWaiter: 1,
                    completionTime: {
                        $divide: [
                            { $subtract: ['$actualReadyTime', '$createdAt'] },
                            1000 * 60
                        ]
                    }
                }
            },
            {
                $match: { completionTime: { $gte: 0, $lte: 180 } }
            },
            {
                $group: {
                    _id: '$createdByWaiter',
                    avgCompletionTime: { $avg: '$completionTime' }
                }
            }
        ]);

        // 6. Merge all stats
        const waiterAnalytics = waiters.map(waiter => {
            const orders = orderStats.find(s => s._id?.toString() === waiter._id.toString());
            const calls = callStats.find(s => s._id?.toString() === waiter._id.toString());
            const service = serviceTimeStats.find(s => s._id?.toString() === waiter._id.toString());
            const completion = completionTimeStats.find(s => s._id?.toString() === waiter._id.toString());

            const totalOrders = orders?.totalOrders || 0;
            const totalRevenue = orders?.totalRevenue || 0;
            const totalTables = orders?.totalTables?.length || 0;
            const totalDishes = orders?.totalDishes || 0;
            const callsResolved = calls?.callsResolved || 0;
            const avgServiceTime = service?.avgServiceTime || 0;
            const avgCompletionTime = completion?.avgCompletionTime || 0;

            // Efficiency score (0-100)
            let efficiency = 0;
            if (totalOrders > 0) {
                const orderScore = Math.min((totalOrders / 50) * 40, 40);
                const serviceScore = avgServiceTime > 0 ? Math.max(30 - (avgServiceTime / 10), 0) : 15;
                const callScore = Math.min((callsResolved / 20) * 20, 20);
                const completionScore = avgCompletionTime > 0 ? Math.max(10 - (avgCompletionTime / 30), 0) : 5;
                efficiency = Math.min(orderScore + serviceScore + callScore + completionScore, 100);
            }

            return {
                waiterId: waiter._id,
                waiterName: waiter.name,
                waiterEmail: waiter.email,
                waiterAvatar: waiter.avatar,
                active: waiter.active,
                metrics: {
                    totalOrders,
                    totalRevenue: Math.round(totalRevenue),
                    totalTables,
                    totalDishes,
                    callsResolved,
                    cancelledOrders: orders?.cancelledOrders || 0,
                    avgServiceTime: Math.round(avgServiceTime),
                    avgCompletionTime: Math.round(avgCompletionTime),
                    avgResponseTime: Math.round(calls?.avgResponseTime || 0),
                    efficiency: Math.round(efficiency)
                }
            };
        });

        // Sort by efficiency descending
        waiterAnalytics.sort((a, b) => b.metrics.efficiency - a.metrics.efficiency);

        res.json({
            period: startDate ? `${startDate} to ${endDate}` : `Last ${period}`,
            waiters: waiterAnalytics,
            summary: {
                totalWaiters: waiters.length,
                activeWaiters: waiters.filter(w => w.active).length,
                totalOrders: waiterAnalytics.reduce((sum, w) => sum + w.metrics.totalOrders, 0),
                totalRevenue: waiterAnalytics.reduce((sum, w) => sum + w.metrics.totalRevenue, 0),
                avgEfficiency: Math.round(
                    waiterAnalytics.reduce((sum, w) => sum + w.metrics.efficiency, 0) / (waiters.length || 1)
                )
            }
        });
    } catch (error) {
        console.error('Get waiter analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch waiter analytics', details: error.message });
    }
};

/**
 * Get detailed analytics for a specific waiter
 * GET /api/analytics/:restaurantId/waiters/:waiterId
 */
export const getWaiterDetailedAnalytics = async (req, res) => {
    try {
        const { id: restaurantId, waiterId } = req.params;
        const { startDate, endDate, period = '30d' } = req.query;

        const dateFilter = buildDateFilter(startDate, endDate, period);

        // Get waiter info
        const waiter = await User.findById(waiterId).select('name email active avatar');
        if (!waiter) {
            return res.status(404).json({ error: 'Waiter not found' });
        }

        // Performance by Shift
        const performanceByShift = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: new mongoose.Types.ObjectId(waiterId),
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                }
            },
            {
                $project: {
                    total: 1,
                    hour: { $hour: '$createdAt' },
                    shift: {
                        $switch: {
                            branches: [
                                { case: { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 12] }] }, then: 'Morning' },
                                { case: { $and: [{ $gte: ['$hour', 12] }, { $lt: ['$hour', 18] }] }, then: 'Afternoon' }
                            ],
                            default: 'Night'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$shift',
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }
            }
        ]);

        // Performance by Day of Week
        const performanceByDay = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: new mongoose.Types.ObjectId(waiterId),
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const formattedDays = performanceByDay.map(d => ({
            day: dayNames[d._id - 1],
            orders: d.orders,
            revenue: Math.round(d.revenue)
        }));

        // Weekly Trend
        const weeklyTrend = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: new mongoose.Types.ObjectId(waiterId),
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
        ]);

        // Top Customers served by this waiter
        const topCustomers = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: new mongoose.Types.ObjectId(waiterId),
                    status: { $ne: 'cancelled' },
                    phone: { $exists: true, $ne: null, $not: /^anon_/ },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$phone',
                    name: { $first: '$customerName' },
                    totalSpent: { $sum: '$total' },
                    orderCount: { $count: {} }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 }
        ]);

        // Efficiency Insights
        const restaurantAvg = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    status: { $ne: 'cancelled' },
                    actualReadyTime: { $exists: true },
                    ...dateFilter
                }
            },
            {
                $project: {
                    completionTime: {
                        $divide: [
                            { $subtract: ['$actualReadyTime', '$createdAt'] },
                            1000 * 60
                        ]
                    }
                }
            },
            { $match: { completionTime: { $gte: 0, $lte: 180 } } },
            { $group: { _id: null, avgCompletionTime: { $avg: '$completionTime' } } }
        ]);

        const waiterAvg = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    createdByWaiter: new mongoose.Types.ObjectId(waiterId),
                    status: { $ne: 'cancelled' },
                    actualReadyTime: { $exists: true },
                    ...dateFilter
                }
            },
            {
                $project: {
                    completionTime: {
                        $divide: [
                            { $subtract: ['$actualReadyTime', '$createdAt'] },
                            1000 * 60
                        ]
                    }
                }
            },
            { $match: { completionTime: { $gte: 0, $lte: 180 } } },
            { $group: { _id: null, avgCompletionTime: { $avg: '$completionTime' } } }
        ]);

        const resAvg = restaurantAvg[0]?.avgCompletionTime || 0;
        const wAvg = waiterAvg[0]?.avgCompletionTime || 0;

        res.json({
            waiter: {
                id: waiter._id,
                name: waiter.name,
                email: waiter.email,
                active: waiter.active,
                avatar: waiter.avatar
            },
            performance: {
                byShift: performanceByShift,
                byDay: formattedDays,
                weeklyTrend: weeklyTrend.map(w => ({
                    date: w._id,
                    orders: w.orders,
                    revenue: Math.round(w.revenue)
                })),
                topCustomers: topCustomers.map(tc => ({
                    name: tc.name || 'Cliente',
                    phone: tc._id,
                    spent: Math.round(tc.totalSpent),
                    orders: tc.orderCount
                })),
                insights: {
                    avgCompletionTime: Math.round(wAvg),
                    restaurantAvgCompletionTime: Math.round(resAvg),
                    isFasterThanAverage: wAvg < resAvg,
                    differencePercentage: resAvg > 0 ? Math.round(((resAvg - wAvg) / resAvg) * 100) : 0
                }
            }
        });
    } catch (error) {
        console.error('Get waiter detailed analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch waiter detailed analytics', details: error.message });
    }
};

/**
 * Get waiter ranking/leaderboard
 * GET /api/analytics/:restaurantId/waiters/ranking
 */
export const getWaiterRanking = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { metric = 'orders', period = '7d' } = req.query;

        const days = parseInt(period.replace('d', '')) || 7;
        const dateFilter = {
            createdAt: { $gte: subDays(new Date(), days) }
        };

        // Get all waiters via UserRestaurantRole (FIXED)
        const waiters = await getWaiterIdsForRestaurant(restaurantId);
        const activeWaiters = waiters.filter(w => w.active);
        const waiterIds = activeWaiters.map(w => w._id);

        let rankings = [];

        if (metric === 'revenue') {
            rankings = await Order.aggregate([
                {
                    $match: {
                        restaurant: new mongoose.Types.ObjectId(restaurantId),
                        createdByWaiter: { $in: waiterIds },
                        status: { $ne: 'cancelled' },
                        ...dateFilter
                    }
                },
                { $group: { _id: '$createdByWaiter', value: { $sum: '$total' } } },
                { $sort: { value: -1 } },
                { $limit: 10 }
            ]);
        } else if (metric === 'calls') {
            rankings = await WaiterCall.aggregate([
                {
                    $match: {
                        restaurant: new mongoose.Types.ObjectId(restaurantId),
                        resolvedBy: { $in: waiterIds },
                        status: 'resolved',
                        ...dateFilter
                    }
                },
                { $group: { _id: '$resolvedBy', value: { $sum: 1 } } },
                { $sort: { value: -1 } },
                { $limit: 10 }
            ]);
        } else {
            // Default: orders
            rankings = await Order.aggregate([
                {
                    $match: {
                        restaurant: new mongoose.Types.ObjectId(restaurantId),
                        createdByWaiter: { $in: waiterIds },
                        status: { $ne: 'cancelled' },
                        ...dateFilter
                    }
                },
                { $group: { _id: '$createdByWaiter', value: { $sum: 1 } } },
                { $sort: { value: -1 } },
                { $limit: 10 }
            ]);
        }

        // Enrich with waiter names
        const enrichedRankings = rankings.map((r, index) => {
            const waiter = activeWaiters.find(w => w._id.toString() === r._id?.toString());
            return {
                rank: index + 1,
                waiterId: r._id,
                waiterName: waiter?.name || 'Unknown',
                value: metric === 'revenue' ? Math.round(r.value) : r.value
            };
        });

        res.json({ metric, period, rankings: enrichedRankings });
    } catch (error) {
        console.error('Get waiter ranking error:', error);
        res.status(500).json({ error: 'Failed to fetch waiter ranking', details: error.message });
    }
};

/**
 * Get waiter table-level history (which tables, which dishes, amounts)
 * GET /api/analytics/:restaurantId/waiters/:waiterId/tables
 */
export const getWaiterTableHistory = async (req, res) => {
    try {
        const { id: restaurantId, waiterId } = req.params;
        const { startDate, endDate, period = '7d' } = req.query;

        const dateFilter = buildDateFilter(startDate, endDate, period);

        // Get orders with table and item details
        const orders = await Order.find({
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            createdByWaiter: new mongoose.Types.ObjectId(waiterId),
            status: { $ne: 'cancelled' },
            ...dateFilter
        })
            .populate('table', 'number location')
            .populate('items.item', 'name category price')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Group by table
        const tableMap = {};
        for (const order of orders) {
            const tableKey = order.table?._id?.toString() || 'no-table';
            const tableNum = order.table?.number || '—';

            if (!tableMap[tableKey]) {
                tableMap[tableKey] = {
                    tableId: tableKey,
                    tableNumber: tableNum,
                    tableLocation: order.table?.location || '',
                    orders: [],
                    totalRevenue: 0,
                    totalOrders: 0,
                    totalDishes: 0
                };
            }

            const dishes = (order.items || []).map(item => ({
                name: item.item?.name || 'Desconhecido',
                qty: item.qty || 1,
                price: item.itemPrice || item.item?.price || 0,
                subtotal: item.subtotal || 0
            }));

            tableMap[tableKey].orders.push({
                orderId: order._id,
                createdAt: order.createdAt,
                status: order.status,
                total: order.total,
                dishes,
                customerName: order.customerName || 'Cliente'
            });

            tableMap[tableKey].totalRevenue += order.total || 0;
            tableMap[tableKey].totalOrders += 1;
            tableMap[tableKey].totalDishes += dishes.reduce((s, d) => s + d.qty, 0);
        }

        const tables = Object.values(tableMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Summary
        const summary = {
            totalOrders: orders.length,
            totalTables: tables.length,
            totalRevenue: tables.reduce((s, t) => s + t.totalRevenue, 0),
            totalDishes: tables.reduce((s, t) => s + t.totalDishes, 0)
        };

        res.json({ tables, summary });
    } catch (error) {
        console.error('Get waiter table history error:', error);
        res.status(500).json({ error: 'Failed to fetch waiter table history', details: error.message });
    }
};
