import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import mongoose from 'mongoose';
import { subDays, startOfDay, endOfDay } from 'date-fns';

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
    return { createdAt: { $gte: subDays(new Date(), days) } };
}

/**
 * Kitchen Dashboard — Summary KPIs
 * GET /api/analytics/:id/kitchen
 */
export const getKitchenDashboard = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { startDate, endDate, period = '7d' } = req.query;

        const dateFilter = buildDateFilter(startDate, endDate, period);

        const restaurantObjId = new mongoose.Types.ObjectId(restaurantId);

        // Total orders in period
        const [totalOrders, completedOrders, cancelledOrders, pendingNow, preparingNow] = await Promise.all([
            Order.countDocuments({ restaurant: restaurantObjId, ...dateFilter }),
            Order.countDocuments({
                restaurant: restaurantObjId,
                status: { $in: ['ready', 'completed', 'served'] },
                ...dateFilter
            }),
            Order.countDocuments({
                restaurant: restaurantObjId,
                status: 'cancelled',
                ...dateFilter
            }),
            Order.countDocuments({
                restaurant: restaurantObjId,
                status: { $in: ['pending', 'confirmed'] }
            }),
            Order.countDocuments({
                restaurant: restaurantObjId,
                status: 'preparing'
            })
        ]);

        // Average prep time for completed orders
        const avgPrepResult = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjId,
                    status: { $in: ['ready', 'completed', 'served'] },
                    actualReadyTime: { $exists: true },
                    ...dateFilter
                }
            },
            {
                $project: {
                    prepTime: {
                        $divide: [{ $subtract: ['$actualReadyTime', '$createdAt'] }, 60000]
                    }
                }
            },
            { $match: { prepTime: { $gte: 0, $lte: 180 } } },
            {
                $group: {
                    _id: null,
                    avgPrepTime: { $avg: '$prepTime' },
                    minPrepTime: { $min: '$prepTime' },
                    maxPrepTime: { $max: '$prepTime' }
                }
            }
        ]);

        // Delayed orders: completed orders that took > 30 minutes
        const delayedOrders = await Order.countDocuments({
            restaurant: restaurantObjId,
            status: { $in: ['ready', 'completed', 'served'] },
            actualReadyTime: { $exists: true },
            $expr: {
                $gt: [
                    { $divide: [{ $subtract: ['$actualReadyTime', '$createdAt'] }, 60000] },
                    30
                ]
            },
            ...dateFilter
        });

        // Total dishes prepared
        const dishCountResult = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjId,
                    status: { $in: ['ready', 'completed', 'served'] },
                    ...dateFilter
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: null,
                    totalDishes: { $sum: '$items.qty' }
                }
            }
        ]);

        const avgPrepTime = avgPrepResult[0]?.avgPrepTime || 0;
        const totalDishes = dishCountResult[0]?.totalDishes || 0;

        // Efficiency: % of orders completed within 25 minutes
        const ordersWithinTarget = await Order.countDocuments({
            restaurant: restaurantObjId,
            status: { $in: ['ready', 'completed', 'served'] },
            actualReadyTime: { $exists: true },
            $expr: {
                $lte: [
                    { $divide: [{ $subtract: ['$actualReadyTime', '$createdAt'] }, 60000] },
                    25
                ]
            },
            ...dateFilter
        });
        const efficiency = completedOrders > 0
            ? Math.round((ordersWithinTarget / completedOrders) * 100)
            : 0;

        res.json({
            period: startDate ? `${startDate} to ${endDate}` : `Last ${period}`,
            kpis: {
                totalOrders,
                completedOrders,
                cancelledOrders,
                pendingNow,
                preparingNow,
                totalDishes,
                delayedOrders,
                efficiency,
                avgPrepTime: Math.round(avgPrepTime),
                minPrepTime: Math.round(avgPrepResult[0]?.minPrepTime || 0),
                maxPrepTime: Math.round(avgPrepResult[0]?.maxPrepTime || 0),
                cancellationRate: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
                delayRate: completedOrders > 0 ? Math.round((delayedOrders / completedOrders) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Kitchen dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch kitchen dashboard', details: error.message });
    }
};

/**
 * Dish Prep Stats — Per dish analytics
 * GET /api/analytics/:id/kitchen/dishes
 */
export const getDishPrepStats = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { startDate, endDate, period = '30d', limit = 20 } = req.query;

        const dateFilter = buildDateFilter(startDate, endDate, period);
        const restaurantObjId = new mongoose.Types.ObjectId(restaurantId);

        // Dish frequency (most ordered dishes)
        const dishFrequency = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjId,
                    status: { $in: ['ready', 'completed', 'served'] },
                    ...dateFilter
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'items.item',
                    foreignField: '_id',
                    as: 'menuItem'
                }
            },
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'menuItem.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$items.item',
                    name: { $first: { $ifNull: ['$menuItem.name', 'Desconhecido'] } },
                    category: { $first: { $ifNull: ['$category.name', 'Sem Categoria'] } },
                    totalQuantity: { $sum: '$items.qty' },
                    totalRevenue: { $sum: '$items.subtotal' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: parseInt(limit) }
        ]);

        // Prep time per dish (using order-level prep time as proxy)
        const dishPrepTimes = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjId,
                    status: { $in: ['ready', 'completed', 'served'] },
                    actualReadyTime: { $exists: true },
                    ...dateFilter
                }
            },
            {
                $project: {
                    items: 1,
                    prepTime: {
                        $divide: [{ $subtract: ['$actualReadyTime', '$createdAt'] }, 60000]
                    }
                }
            },
            { $match: { prepTime: { $gte: 0, $lte: 180 } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'items.item',
                    foreignField: '_id',
                    as: 'menuItem'
                }
            },
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$items.item',
                    name: { $first: { $ifNull: ['$menuItem.name', 'Desconhecido'] } },
                    avgPrepTime: { $avg: '$prepTime' },
                    minPrepTime: { $min: '$prepTime' },
                    maxPrepTime: { $max: '$prepTime' },
                    samples: { $sum: 1 }
                }
            },
            { $match: { samples: { $gte: 1 } } },
            { $sort: { avgPrepTime: -1 } }
        ]);

        // Merge frequency + prep time
        const merged = dishFrequency.map(dish => {
            const prepStats = dishPrepTimes.find(p => p._id?.toString() === dish._id?.toString());
            return {
                itemId: dish._id,
                name: dish.name,
                category: dish.category,
                totalQuantity: dish.totalQuantity,
                totalRevenue: Math.round(dish.totalRevenue || 0),
                orderCount: dish.orderCount,
                avgPrepTime: prepStats ? Math.round(prepStats.avgPrepTime) : null,
                minPrepTime: prepStats ? Math.round(prepStats.minPrepTime) : null,
                maxPrepTime: prepStats ? Math.round(prepStats.maxPrepTime) : null,
                isBottleneck: prepStats ? prepStats.avgPrepTime > 30 : false
            };
        });

        // Slowest dishes (highest avg prep time with enough samples)
        const slowestDishes = [...dishPrepTimes]
            .filter(d => d.samples >= 2)
            .sort((a, b) => b.avgPrepTime - a.avgPrepTime)
            .slice(0, 5)
            .map(d => ({
                name: d.name,
                avgPrepTime: Math.round(d.avgPrepTime),
                samples: d.samples
            }));

        // Fastest dishes
        const fastestDishes = [...dishPrepTimes]
            .filter(d => d.samples >= 2)
            .sort((a, b) => a.avgPrepTime - b.avgPrepTime)
            .slice(0, 5)
            .map(d => ({
                name: d.name,
                avgPrepTime: Math.round(d.avgPrepTime),
                samples: d.samples
            }));

        res.json({
            dishes: merged,
            slowestDishes,
            fastestDishes,
            bottlenecks: merged.filter(d => d.isBottleneck).length
        });
    } catch (error) {
        console.error('Dish prep stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dish prep stats', details: error.message });
    }
};

/**
 * Kitchen Timeline — Hourly throughput
 * GET /api/analytics/:id/kitchen/timeline
 */
export const getKitchenTimeline = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { startDate, endDate, period = '7d' } = req.query;

        const dateFilter = buildDateFilter(startDate, endDate, period);
        const restaurantObjId = new mongoose.Types.ObjectId(restaurantId);

        // Orders by hour of day
        const hourlyOrders = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjId,
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill all 24 hours
        const timeline = Array.from({ length: 24 }, (_, hour) => {
            const found = hourlyOrders.find(h => h._id === hour);
            return {
                hour: `${String(hour).padStart(2, '0')}:00`,
                orders: found?.orders || 0,
                revenue: Math.round(found?.revenue || 0)
            };
        });

        // Daily trend (last N days)
        const dailyTrend = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjId,
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' },
                    avgPrepTime: {
                        $avg: {
                            $cond: [
                                { $and: ['$actualReadyTime', { $ne: ['$status', 'cancelled'] }] },
                                { $divide: [{ $subtract: ['$actualReadyTime', '$createdAt'] }, 60000] },
                                null
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Find peak hour
        const peakHour = timeline.reduce((max, h) => h.orders > max.orders ? h : max, timeline[0]);

        res.json({
            timeline,
            dailyTrend: dailyTrend.map(d => ({
                date: d._id,
                orders: d.orders,
                revenue: Math.round(d.revenue),
                avgPrepTime: d.avgPrepTime ? Math.round(d.avgPrepTime) : 0
            })),
            peakHour: peakHour?.hour || '—'
        });
    } catch (error) {
        console.error('Kitchen timeline error:', error);
        res.status(500).json({ error: 'Failed to fetch kitchen timeline', details: error.message });
    }
};

/**
 * Kitchen Shift Report
 * GET /api/analytics/:id/kitchen/shifts
 */
export const getKitchenShiftReport = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { startDate, endDate, period = '30d' } = req.query;

        const dateFilter = buildDateFilter(startDate, endDate, period);
        const restaurantObjId = new mongoose.Types.ObjectId(restaurantId);

        const shiftData = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjId,
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                }
            },
            {
                $project: {
                    total: 1,
                    status: 1,
                    actualReadyTime: 1,
                    createdAt: 1,
                    hour: { $hour: '$createdAt' },
                    prepTime: {
                        $cond: [
                            '$actualReadyTime',
                            { $divide: [{ $subtract: ['$actualReadyTime', '$createdAt'] }, 60000] },
                            null
                        ]
                    }
                }
            },
            {
                $addFields: {
                    shift: {
                        $switch: {
                            branches: [
                                { case: { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 12] }] }, then: 'morning' },
                                { case: { $and: [{ $gte: ['$hour', 12] }, { $lt: ['$hour', 18] }] }, then: 'afternoon' }
                            ],
                            default: 'night'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$shift',
                    totalOrders: { $sum: 1 },
                    completedOrders: {
                        $sum: { $cond: [{ $in: ['$status', ['ready', 'completed', 'served']] }, 1, 0] }
                    },
                    totalRevenue: { $sum: '$total' },
                    avgPrepTime: { $avg: '$prepTime' },
                    delayedOrders: {
                        $sum: { $cond: [{ $and: [{ $ne: ['$prepTime', null] }, { $gt: ['$prepTime', 30] }] }, 1, 0] }
                    }
                }
            }
        ]);

        const shiftNames = ['morning', 'afternoon', 'night'];
        const shiftLabels = { morning: 'Manhã (06-12h)', afternoon: 'Tarde (12-18h)', night: 'Noite (18-06h)' };

        const shifts = shiftNames.map(shiftId => {
            const found = shiftData.find(s => s._id === shiftId);
            return {
                shift: shiftId,
                label: shiftLabels[shiftId],
                totalOrders: found?.totalOrders || 0,
                completedOrders: found?.completedOrders || 0,
                totalRevenue: Math.round(found?.totalRevenue || 0),
                avgPrepTime: found?.avgPrepTime ? Math.round(found.avgPrepTime) : 0,
                delayedOrders: found?.delayedOrders || 0,
                efficiency: found?.completedOrders > 0
                    ? Math.round(((found.completedOrders - found.delayedOrders) / found.completedOrders) * 100)
                    : 0
            };
        });

        res.json({ shifts });
    } catch (error) {
        console.error('Kitchen shift report error:', error);
        res.status(500).json({ error: 'Failed to fetch kitchen shift report', details: error.message });
    }
};
