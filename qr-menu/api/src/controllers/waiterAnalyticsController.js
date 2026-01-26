import Order from '../models/Order.js';
import WaiterCall from '../models/WaiterCall.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Get all waiters with summary performance metrics
 * GET /api/analytics/:restaurantId/waiters
 */
export const getAllWaiterAnalytics = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { startDate, endDate, period = '30d' } = req.query;

        // Date Filter
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        } else {
            // Default: last 30 days
            const days = parseInt(period.replace('d', '')) || 30;
            dateFilter = {
                createdAt: { $gte: subDays(new Date(), days) }
            };
        }

        // 1. Get all waiters for this restaurant
        const waiters = await User.find({
            restaurant: restaurantId,
            'role.name': { $in: ['Waiter', 'Garçom', 'Atendente'] }
        }).select('_id name email active');

        const waiterIds = waiters.map(w => w._id);

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

        // 4. Calculate Service Time (Table occupation to order creation)
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
                $match: { serviceTime: { $ne: null, $gte: 0, $lte: 120 } } // Filter outliers
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
                $match: { completionTime: { $gte: 0, $lte: 180 } } // 0-180 min filter
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
            const callsResolved = calls?.callsResolved || 0;
            const avgServiceTime = service?.avgServiceTime || 0;
            const avgCompletionTime = completion?.avgCompletionTime || 0;

            // Calculate efficiency score (0-100)
            // Factors: orders count (40%), service time (30%), calls resolved (20%), completion time (10%)
            let efficiency = 0;
            if (totalOrders > 0) {
                const orderScore = Math.min((totalOrders / 50) * 40, 40); // 50 orders = max 40 points
                const serviceScore = avgServiceTime > 0 ? Math.max(30 - (avgServiceTime / 10), 0) : 0;
                const callScore = Math.min((callsResolved / 20) * 20, 20); // 20 calls = max 20 points
                const completionScore = avgCompletionTime > 0 ? Math.max(10 - (avgCompletionTime / 30), 0) : 0;
                efficiency = Math.min(orderScore + serviceScore + callScore + completionScore, 100);
            }

            return {
                waiterId: waiter._id,
                waiterName: waiter.name,
                waiterEmail: waiter.email,
                active: waiter.active,
                metrics: {
                    totalOrders,
                    totalRevenue: Math.round(totalRevenue),
                    callsResolved,
                    cancelledOrders: orders?.cancelledOrders || 0,
                    avgServiceTime: Math.round(avgServiceTime),
                    avgCompletionTime: Math.round(avgCompletionTime),
                    avgResponseTime: Math.round(calls?.avgResponseTime || 0),
                    efficiency: Math.round(efficiency)
                }
            };
        });

        // Sort by efficiency
        waiterAnalytics.sort((a, b) => b.metrics.efficiency - a.metrics.efficiency);

        res.json({
            period: startDate ? `${startDate} to ${endDate}` : `Last ${period}`,
            waiters: waiterAnalytics,
            summary: {
                totalWaiters: waiters.length,
                activeWaiters: waiters.filter(w => w.active).length,
                totalOrders: waiterAnalytics.reduce((sum, w) => sum + w.metrics.totalOrders, 0),
                avgEfficiency: Math.round(
                    waiterAnalytics.reduce((sum, w) => sum + w.metrics.efficiency, 0) / waiters.length || 0
                )
            }
        });
    } catch (error) {
        console.error('Get waiter analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch waiter analytics' });
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

        // Date Filter
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        } else {
            const days = parseInt(period.replace('d', '')) || 30;
            dateFilter = {
                createdAt: { $gte: subDays(new Date(), days) }
            };
        }

        // Get waiter info
        const waiter = await User.findById(waiterId).select('name email active');
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

        res.json({
            waiter: {
                id: waiter._id,
                name: waiter.name,
                email: waiter.email,
                active: waiter.active
            },
            performance: {
                byShift: performanceByShift,
                byDay: formattedDays,
                weeklyTrend: weeklyTrend.map(w => ({
                    date: w._id,
                    orders: w.orders,
                    revenue: Math.round(w.revenue)
                }))
            }
        });
    } catch (error) {
        console.error('Get waiter detailed analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch waiter detailed analytics' });
    }
};

/**
 * Get waiter ranking/leaderboard
 * GET /api/analytics/:restaurantId/waiters/ranking
 */
export const getWaiterRanking = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { metric = 'efficiency', period = '7d' } = req.query;

        const days = parseInt(period.replace('d', '')) || 7;
        const dateFilter = {
            createdAt: { $gte: subDays(new Date(), days) }
        };

        // Get all waiters
        const waiters = await User.find({
            restaurant: restaurantId,
            'role.name': { $in: ['Waiter', 'Garçom', 'Atendente'] },
            active: true
        }).select('_id name');

        const waiterIds = waiters.map(w => w._id);

        // Aggregate based on metric
        let rankings = [];

        if (metric === 'orders') {
            rankings = await Order.aggregate([
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
                        value: { $sum: 1 }
                    }
                },
                { $sort: { value: -1 } },
                { $limit: 10 }
            ]);
        } else if (metric === 'revenue') {
            rankings = await Order.aggregate([
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
                        value: { $sum: '$total' }
                    }
                },
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
                {
                    $group: {
                        _id: '$resolvedBy',
                        value: { $sum: 1 }
                    }
                },
                { $sort: { value: -1 } },
                { $limit: 10 }
            ]);
        }

        // Enrich with waiter names
        const enrichedRankings = rankings.map((r, index) => {
            const waiter = waiters.find(w => w._id.toString() === r._id?.toString());
            return {
                rank: index + 1,
                waiterId: r._id,
                waiterName: waiter?.name || 'Unknown',
                value: metric === 'revenue' ? Math.round(r.value) : r.value
            };
        });

        res.json({
            metric,
            period,
            rankings: enrichedRankings
        });
    } catch (error) {
        console.error('Get waiter ranking error:', error);
        res.status(500).json({ error: 'Failed to fetch waiter ranking' });
    }
};
