import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import mongoose from 'mongoose';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import MenuItem from '../models/MenuItem.js';
import WaiterCall from '../models/WaiterCall.js';
import Table from '../models/Table.js';
import TableSession from '../models/TableSession.js';
import User from '../models/User.js';
import { calculateTopWaiter, calculateTopDish, calculateFastestDish } from './ownerStatsHelpers.js';

export const getOwnerStats = async (req, res) => {
    try {
        const ownerId = req.user._id;

        // 1. Get all restaurants owned by user
        const restaurants = await Restaurant.find({ owner: ownerId })
            .select('_id name settings subscription')
            .populate('subscription', 'status');

        const restaurantIds = restaurants.map(r => r._id);

        if (restaurantIds.length === 0) {
            return res.json({
                totalRevenue: 0,
                totalOrders: 0,
                activeRestaurants: 0,
                revenueByRestaurant: [],
                topWaiter: null,
                topDish: null,
                fastestDish: null
            });
        }

        const { period = 'today' } = req.query;
        let dateFilter = {};

        const now = new Date();
        if (period === 'today') {
            dateFilter = {
                createdAt: {
                    $gte: startOfDay(now),
                    $lte: endOfDay(now)
                }
            };
        } else if (period === 'week') {
            dateFilter = {
                createdAt: {
                    $gte: subDays(now, 7),
                    $lte: endOfDay(now)
                }
            };
        } else if (period === 'month') {
            dateFilter = {
                createdAt: {
                    $gte: subDays(now, 30),
                    $lte: endOfDay(now)
                }
            };
        } else if (period === 'lastMonth' || period === 'last_month') {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            dateFilter = {
                createdAt: {
                    $gte: startOfLastMonth,
                    $lte: endOfLastMonth
                }
            };
        }

        // 2. Aggregate Global Stats (Revenue & Orders)
        const globalStats = await Order.aggregate([
            { 
                $match: { 
                    restaurant: { $in: restaurantIds }, 
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                } 
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $count: {} }
                }
            }
        ]);

        // 3. Aggregate Revenue by Restaurant
        const revenueByRestaurant = await Order.aggregate([
            { 
                $match: { 
                    restaurant: { $in: restaurantIds }, 
                    status: { $ne: 'cancelled' },
                    ...dateFilter
                } 
            },
            {
                $group: {
                    _id: '$restaurant',
                    revenue: { $sum: '$total' },
                    orders: { $count: {} }
                }
            }
        ]);

        // Map back to restaurant names
        const revenueData = restaurants.map(r => {
            const stats = revenueByRestaurant.find(s => s._id.toString() === r._id.toString());
            return {
                id: r._id,
                name: r.name,
                revenue: stats ? stats.revenue : 0,
                orders: stats ? stats.orders : 0,
                subscriptionStatus: r.subscription?.status || 'suspended'
            };
        }).sort((a, b) => b.revenue - a.revenue);

        // 4. 🏆 CALCULATE TOP WAITER based on performance
        const topWaiter = await calculateTopWaiter(restaurantIds, restaurants, dateFilter);

        // 5. 🍽️ CALCULATE TOP DISH based on quantity sold
        const topDish = await calculateTopDish(restaurantIds, restaurants, dateFilter);

        // 6. ⚡ CALCULATE FASTEST DISH based on prep time
        const fastestDish = await calculateFastestDish(restaurantIds, restaurants, dateFilter);

        res.json({
            totalRevenue: globalStats[0]?.totalRevenue || 0,
            totalOrders: globalStats[0]?.totalOrders || 0,
            activeRestaurants: restaurants.length,
            revenueByRestaurant: revenueData,
            topWaiter,
            topDish,
            fastestDish
        });

    } catch (error) {
        console.error('Owner stats error:', error);
        res.status(500).json({ error: 'Failed to fetch owner stats' });
    }
};

export const clearOwnerStats = async (req, res) => {
    try {
        const ownerId = req.user._id;

        // 1. Get all restaurants owned by user
        const restaurants = await Restaurant.find({ owner: ownerId }).select('_id');
        const restaurantIds = restaurants.map(r => r._id);

        if (restaurantIds.length === 0) {
            return res.status(404).json({ message: 'No restaurants found for this owner' });
        }

        // 2. Delete all Orders
        await Order.deleteMany({ restaurant: { $in: restaurantIds } });

        // 3. Reset Tables (Free them and clear sessions)
        await Table.updateMany(
            { restaurant: { $in: restaurantIds } },
            {
                $set: {
                    status: 'free',
                    currentSessionId: null,
                    occupiedAt: null
                }
            }
        );

        // 4. Delete Table Sessions
        await TableSession.deleteMany({ restaurant: { $in: restaurantIds } });

        // 5. Delete Waiter Calls (Optional but good for clean slate)
        await WaiterCall.deleteMany({ restaurant: { $in: restaurantIds } });

        res.json({ message: 'Financial data and operational state cleared successfully' });

    } catch (error) {
        console.error('Clear stats error:', error);
        res.status(500).json({ error: 'Failed to clear stats' });
    }
};

export const getRestaurantStats = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Date Filter
        const query = {
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $ne: 'cancelled' }
        };

        if (startDate && endDate) {
            query.createdAt = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        } else {
            // Default to last 30 days if not specified
            query.createdAt = {
                $gte: subDays(new Date(), 30)
            };
        }

        // REAL-TIME KPIS (Snapshot of now)
        // 1. Active Orders: 'pending', 'confirmed', 'preparing'
        const activeOrdersCount = await Order.countDocuments({
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
        });

        // 2. Pending Orders: 'pending', 'confirmed'
        const pendingOrdersCount = await Order.countDocuments({
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $in: ['pending', 'confirmed'] }
        });

        // 3. Completed Orders: 'ready', 'completed', 'served' (Matching the date filter of the report)
        const completedOrdersCount = await Order.countDocuments({
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $in: ['ready', 'completed', 'served'] },
            createdAt: query.createdAt // Apply same date filter
        });

        // 4. Occupied Tables: Count distinct tables in active/open orders
        const occupiedTablesResult = await Order.distinct('table', {
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
        });
        const occupiedTablesCount = occupiedTablesResult.length;

        // 5. Active Waiter Calls
        const activeWaiterCallsCount = await WaiterCall.countDocuments({
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $in: ['pending', 'acknowledged'] }
        });


        // 1. Financial Stats
        const financialStats = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $count: {} },
                    avgTicket: { $avg: '$total' }
                }
            }
        ]);

        // 2. Payment Methods
        const paymentMethods = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $count: {} },
                    revenue: { $sum: '$total' }
                }
            }
        ]);

        // 3. Revenue Trend (Daily)
        const revenueTrend = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: '$total' },
                    orders: { $count: {} }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Kitchen Performance (Avg Prep Time)
        // Logic: Time between 'confirmed' (or created) and 'ready'
        // We use actualReadyTime if available, else look at statusHistory
        // Simplified: avg of (actualReadyTime - createdAt) in minutes, for orders that are ready/completed
        const kitchenStats = await Order.aggregate([
            {
                $match: {
                    ...query,
                    status: { $in: ['ready', 'completed'] },
                    actualReadyTime: { $exists: true }
                }
            },
            {
                $project: {
                    prepTime: {
                        $divide: [
                            { $subtract: ["$actualReadyTime", "$createdAt"] },
                            1000 * 60 // Convert ms to minutes
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgPrepTime: { $avg: "$prepTime" }
                }
            }
        ]);

        // 5. Customer Insights (New vs Returning - Simplified)
        // Group by Phone. If we had a 'customers' collection this would be easier.
        // For now, simple approximation or skip 'New/Returning' strict logic in aggregation
        // and just return Top Customers by Spend
        const topCustomers = await Order.aggregate([
            {
                $match: {
                    ...query,
                    phone: { $exists: true, $ne: null, $not: /^anon_/ }
                }
            },
            {
                $group: {
                    _id: "$phone",
                    name: { $first: "$customerName" },
                    totalSpent: { $sum: "$total" },
                    orderCount: { $count: {} }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 }
        ]);

        // 5. Peak Hours (Busy Times)
        const peakHours = await Order.aggregate([
            { $match: query },
            {
                $project: {
                    hour: { $hour: "$createdAt" }
                }
            },
            {
                $group: {
                    _id: "$hour",
                    count: { $count: {} }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Format Peak Hours for Frontend (0-23 fill)
        const formattedPeakHours = Array.from({ length: 24 }, (_, i) => {
            const found = peakHours.find(p => p._id === i);
            return {
                hour: `${i}:00`,
                orders: found ? found.count : 0
            };
        });

        // 6. Shifts Data (Morning, Afternoon, Night)
        const shiftAggregation = await Order.aggregate([
            { $match: query },
            {
                $project: {
                    hour: { $hour: "$createdAt" }
                }
            },
            {
                $project: {
                    shift: {
                        $switch: {
                            branches: [
                                { case: { $and: [{ $gte: ["$hour", 6] }, { $lt: ["$hour", 12] }] }, then: "morning" },
                                { case: { $and: [{ $gte: ["$hour", 12] }, { $lt: ["$hour", 18] }] }, then: "afternoon" }
                            ],
                            default: "night"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$shift",
                    orders: { $count: {} }
                }
            }
        ]);

        // Ensure all shifts are represented
        const shifts = ['morning', 'afternoon', 'night'].map(s => {
            const found = shiftAggregation.find(sa => sa._id === s);
            return {
                _id: s,
                orders: found ? found.orders : 0
            };
        });

        res.json({
            realtime: {
                activeOrders: activeOrdersCount,
                pendingOrders: pendingOrdersCount,
                completedOrders: completedOrdersCount,
                occupiedTables: occupiedTablesCount,
                activeWaiterCalls: activeWaiterCallsCount
            },
            financial: {
                revenue: financialStats[0]?.totalRevenue || 0,
                orders: financialStats[0]?.totalOrders || 0,
                avgTicket: Math.round(financialStats[0]?.avgTicket || 0),
                paymentMethods,
                revenueTrend
            },
            operational: {
                avgPrepTime: Math.round(kitchenStats[0]?.avgPrepTime || 0),
                peakHours: formattedPeakHours,
                shifts
            },
            customers: {
                top: topCustomers
            }
        });

    } catch (error) {
        console.error('Restaurant stats error:', error);
        res.status(500).json({ error: 'Failed to fetch restaurant stats' });
    }
};

// -----------------------------------------------------------------------------
// ADVANCED REPORTING CONTROLLERS
// -----------------------------------------------------------------------------

export const getFinancialReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const query = {
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $ne: 'cancelled' }
        };

        if (startDate && endDate) {
            query.createdAt = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        } else {
            query.createdAt = { $gte: subDays(new Date(), 30) };
        }

        const revenueTrend = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: '$total' },
                    orders: { $count: {} },
                    avgTicket: { $avg: '$total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const summary = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $count: {} },
                    avgTicket: { $avg: '$total' }
                }
            }
        ]);

        const marginStats = await Order.aggregate([
            { $match: query },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.item",
                    foreignField: "_id",
                    as: "menuItemDetails"
                }
            },
            { $unwind: { path: "$menuItemDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    revenue: "$items.subtotal",
                    cost: { $multiply: [{ $ifNull: ["$menuItemDetails.costPrice", 0] }, "$items.quantity"] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$revenue" },
                    totalCost: { $sum: "$cost" }
                }
            }
        ]);

        const totalRevenue = summary[0]?.totalRevenue || 0;
        const totalCost = marginStats[0]?.totalCost || 0;
        const grossMargin = totalRevenue - totalCost;

        res.json({
            summary: {
                totalRevenue,
                totalOrders: summary[0]?.totalOrders || 0,
                avgTicket: summary[0]?.avgTicket || 0,
                totalCost,
                grossMargin,
                marginPercentage: totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0
            },
            trend: revenueTrend
        });

    } catch (error) {
        console.error('Financial Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch financial report' });
    }
};

export const getSalesReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const query = {
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $ne: 'cancelled' }
        };

        if (startDate && endDate) {
            query.createdAt = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        } else {
            query.createdAt = { $gte: subDays(new Date(), 30) };
        }

        const salesByCategory = await Order.aggregate([
            { $match: query },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.item",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "categories",
                    localField: "product.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$categoryDetails.name", "Sem Categoria"] },
                    revenue: { $sum: "$items.subtotal" },
                    count: { $sum: "$items.quantity" }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        const topItems = await Order.aggregate([
            { $match: query },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.item",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "categories",
                    localField: "product.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$product.name", "Unknown Item"] },
                    revenue: { $sum: "$items.subtotal" },
                    count: { $sum: "$items.quantity" },
                    category: { $first: { $ifNull: ["$categoryDetails.name", "Sem Categoria"] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const paymentMethods = await Order.aggregate([
            { $match: query },
            { $group: { _id: "$paymentMethod", count: { $count: {} }, revenue: { $sum: "$total" } } }
        ]);

        const sources = await Order.aggregate([
            { $match: query },
            { $group: { _id: "$source", count: { $count: {} }, revenue: { $sum: "$total" } } }
        ]);

        const bottomItems = await Order.aggregate([
            { $match: query },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.item",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$product.name", "Unknown Item"] },
                    revenue: { $sum: "$items.subtotal" },
                    count: { $sum: "$items.quantity" },
                    cost: { $sum: { $multiply: ["$items.qty", { $ifNull: ["$product.costPrice", 0] }] } }
                }
            },
            {
                $project: {
                    name: "$_id",
                    revenue: 1,
                    count: 1,
                    profitability: {
                        $cond: [
                            { $gt: ["$revenue", 0] },
                            { $multiply: [{ $divide: [{ $subtract: ["$revenue", "$cost"] }, "$revenue"] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { count: 1 } },
            { $limit: 10 }
        ]);

        // Add profitability to topItems too
        const topItemsWithProfit = topItems.map(item => {
            // Re-calculating or just using the ones from aggregation if I update topItems aggregation
            return item;
        });

        res.json({
            byCategory: salesByCategory,
            topItems,
            bottomItems,
            paymentMethods,
            sources
        });

    } catch (error) {
        console.error('Sales Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch sales report' });
    }
};

export const getOperationalReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const query = {
            restaurant: new mongoose.Types.ObjectId(id),
            status: { $ne: 'cancelled' }
        };

        if (startDate && endDate) {
            query.createdAt = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        } else {
            query.createdAt = { $gte: subDays(new Date(), 30) };
        }

        const shifts = await Order.aggregate([
            { $match: query },
            {
                $project: {
                    hour: { $hour: "$createdAt" },
                    total: 1
                }
            },
            {
                $project: {
                    shift: {
                        $switch: {
                            branches: [
                                { case: { $and: [{ $gte: ["$hour", 6] }, { $lt: ["$hour", 12] }] }, then: "morning" },
                                { case: { $and: [{ $gte: ["$hour", 12] }, { $lt: ["$hour", 18] }] }, then: "afternoon" }
                            ],
                            default: "night"
                        }
                    },
                    total: 1
                }
            },
            {
                $group: {
                    _id: "$shift",
                    revenue: { $sum: "$total" },
                    orders: { $count: {} }
                }
            }
        ]);

        const busiestDays = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" },
                    revenue: { $sum: "$total" },
                    orders: { $count: {} }
                }
            },
            { $sort: { orders: -1 } }
        ]);

        // --- NEW: Prep Time Analytics ---

        // 1. Avg Prep Time (Global for period)
        const prepTimeStats = await Order.aggregate([
            {
                $match: {
                    ...query,
                    status: { $in: ['ready', 'completed', 'served'] },
                    // Use actualReadyTime if possible, otherwise rely on updatedAt or skip
                    // For now, assuming actualReadyTime is being set as per routes update
                    actualReadyTime: { $exists: true }
                }
            },
            {
                $project: {
                    prepTimeMinutes: {
                        $divide: [
                            { $subtract: ["$actualReadyTime", "$createdAt"] },
                            60000 // ms to min
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgPrepTime: { $avg: "$prepTimeMinutes" }
                }
            }
        ]);

        const avgPrepTime = prepTimeStats[0] ? Math.round(prepTimeStats[0].avgPrepTime) : 0;

        // 2. Slowest Items (Items that appear in orders with longest prep times)
        // Note: This is an approximation. We correlate item presence with order duration.
        const slowestItems = await Order.aggregate([
            {
                $match: {
                    ...query,
                    status: { $in: ['ready', 'completed', 'served'] },
                    actualReadyTime: { $exists: true }
                }
            },
            { $unwind: "$items" },
            {
                $project: {
                    item: "$items.item",
                    prepTimeMinutes: {
                        $divide: [
                            { $subtract: ["$actualReadyTime", "$createdAt"] },
                            60000
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$item",
                    avgItemPrepTime: { $avg: "$prepTimeMinutes" },
                    orderCount: { $count: {} } // How many times this item was involved
                }
            },
            { $sort: { avgItemPrepTime: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "_id",
                    foreignField: "_id",
                    as: "details"
                }
            },
            { $unwind: "$details" },
            {
                $project: {
                    name: "$details.name",
                    avgPrepTime: { $round: ["$avgItemPrepTime", 0] },
                    orderCount: 1
                }
            }
        ]);

        // 3. Delivery Time Analytics
        const deliveryStats = await Order.aggregate([
            {
                $match: {
                    ...query,
                    orderType: 'delivery',
                    status: 'completed'
                }
            },
            {
                $project: {
                    deliveryTimeMinutes: {
                        $divide: [
                            { $subtract: ["$completedAt", "$createdAt"] },
                            60000
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgDeliveryTime: { $avg: "$deliveryTimeMinutes" }
                }
            }
        ]);

        res.json({
            shifts,
            busiestDays,
            avgPrepTime,
            slowestItems, // These are the "gargalos"
            avgDeliveryTime: deliveryStats[0] ? Math.round(deliveryStats[0].avgDeliveryTime) : 0
        });

    } catch (error) {
        console.error('Operational Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch operational report' });
    }
};



export const getInventoryReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const items = await MenuItem.find({ restaurant: id })
            .populate('category', 'name')
            .select('name stock stockMin costPrice price imageUrl category active stockControlled unit')
            .sort({ name: 1 });

        // Calculate consumption if dates provided
        let consumption = [];
        if (startDate && endDate) {
            consumption = await Order.aggregate([
                {
                    $match: {
                        restaurant: new mongoose.Types.ObjectId(id),
                        status: { $in: ['completed', 'served', 'paid'] },
                        createdAt: {
                            $gte: startOfDay(new Date(startDate)),
                            $lte: endOfDay(new Date(endDate))
                        }
                    }
                },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.item",
                        consumed: { $sum: "$items.quantity" }
                    }
                }
            ]);
        }

        const stockStatus = items.map(item => {
            const cons = consumption.find(c => c._id?.toString() === item._id.toString());
            return {
                _id: item._id,
                name: item.name,
                stock: item.stock || 0,
                stockMin: item.stockMin || 0,
                unit: item.unit || 'Unidade',
                price: item.price || 0,
                costPrice: item.costPrice || 0,
                category: item.category,
                imageUrl: item.imageUrl,
                active: item.active,
                stockControlled: item.stockControlled,
                totalValue: (item.stock || 0) * (item.costPrice || 0),
                status: (item.stock || 0) < (item.stockMin || 5) ? 'Low' : 'OK',
                consumed: cons ? cons.consumed : 0
            };
        });

        const totalStockValue = stockStatus.reduce((sum, item) => sum + item.totalValue, 0);
        const lowStockCount = stockStatus.filter(i => i.status === 'Low').length;

        res.json({
            summary: {
                totalValue: totalStockValue,
                lowStockCount: lowStockCount,
                totalItems: items.length
            },
            items: stockStatus
        });

    } catch (error) {
        console.error('Inventory Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory report' });
    }
};

export const getCustomerAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurantId = new mongoose.Types.ObjectId(id);

        const basicStats = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantId,
                    status: { $ne: 'cancelled' },
                    phone: { $exists: true, $ne: null, $not: /^anon_/ }
                }
            },
            {
                $lookup: {
                    from: "tables",
                    localField: "table",
                    foreignField: "_id",
                    as: "tableInfo"
                }
            },
            {
                $unwind: {
                    path: "$tableInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: "$phone",
                    name: { $first: "$customerName" },
                    totalSpent: { $sum: "$total" },
                    orderCount: { $count: {} },
                    lastVisit: { $max: "$createdAt" },
                    firstVisit: { $min: "$createdAt" },
                    tables: { $addToSet: { $ifNull: ["$tableInfo.number", "$tableNumber"] } }
                }
            },
            { $sort: { lastVisit: -1 } }
        ]);

        const favorites = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantId,
                    status: { $ne: 'cancelled' },
                    phone: { $exists: true, $ne: null, $not: /^anon_/ }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { phone: "$phone", item: "$items.item" },
                    count: { $sum: "$items.qty" }
                }
            },
            { $sort: { count: -1 } },
            {
                $group: {
                    _id: "$_id.phone",
                    favoriteItemId: { $first: "$_id.item" },
                    favoriteItemCount: { $first: "$count" }
                }
            }
        ]);

        // Populate favorite item names
        await MenuItem.populate(favorites, { path: 'favoriteItemId', select: 'name' });

        const customers = basicStats.map(c => {
            const fav = favorites.find(f => f._id === c._id);
            return {
                ...c,
                phone: c._id,
                favoriteItem: fav?.favoriteItemId?.name || 'Vários',
                isRecurring: c.orderCount > 1,
                tables: (c.tables || []).filter(t => t !== null && t !== undefined).sort((a, b) => a - b)
            };
        });

        const totalCustomers = customers.length;
        const recurringCustomers = customers.filter(c => c.isRecurring).length;

        res.json({
            summary: {
                totalCustomers,
                recurringCustomers,
                loyaltyRate: totalCustomers > 0 ? (recurringCustomers / totalCustomers * 100).toFixed(1) : 0
            },
            customers
        });
    } catch (error) {
        console.error('Customer analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch customer analytics' });
    }
};

export const anonymizeCustomer = async (req, res) => {
    try {
        const { id, phone } = req.params;
        const restaurantId = new mongoose.Types.ObjectId(id);

        if (!phone || phone.startsWith('anon_')) {
            return res.status(400).json({ error: 'Telefone inválido ou já anonimizado' });
        }

        const anonymousPhone = `anon_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const result = await Order.updateMany(
            { restaurant: restaurantId, phone: phone },
            {
                $set: {
                    customerName: 'Cliente Anónimo',
                    phone: anonymousPhone,
                    email: null,
                    deliveryAddress: null
                }
            }
        );

        res.json({
            message: 'Cliente anonimizado com sucesso',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Anonymize customer error:', error);
        res.status(500).json({ error: 'Falha ao anonimizar cliente' });
    }
};

export const getHallAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurantId = new mongoose.Types.ObjectId(id);

        // 1. Get current Table statuses
        const tables = await Table.find({ restaurant: restaurantId })
            .populate('currentSessionId')
            .lean();

        // 2. Aggregate Historical Table Performance
        const tablePerformance = await TableSession.aggregate([
            { $match: { restaurant: restaurantId, status: 'closed', endedAt: { $exists: true } } },
            {
                $project: {
                    table: 1,
                    duration: { $divide: [{ $subtract: ["$endedAt", "$startedAt"] }, 1000 * 60] } // minutes
                }
            },
            {
                $group: {
                    _id: "$table",
                    avgDuration: { $avg: "$duration" },
                    totalSessions: { $count: {} }
                }
            }
        ]);

        // 3. Get total orders and calls per table (Today/Active)
        const today = startOfDay(new Date());
        const activeOrdersByTable = await Order.aggregate([
            { $match: { restaurant: restaurantId, createdAt: { $gte: today }, status: { $ne: 'cancelled' } } },
            { $group: { _id: "$table", count: { $count: {} } } }
        ]);

        const activeCallsByTable = await WaiterCall.aggregate([
            { $match: { restaurant: restaurantId, createdAt: { $gte: today } } },
            { $group: { _id: "$table", count: { $count: {} } } }
        ]);

        // Merge Data
        const hallData = tables.map(t => {
            const perf = tablePerformance.find(p => p._id.toString() === t._id.toString());
            const orders = activeOrdersByTable.find(o => o._id?.toString() === t._id.toString());
            const calls = activeCallsByTable.find(c => c._id?.toString() === t._id.toString());

            return {
                ...t,
                avgDuration: perf ? Math.round(perf.avgDuration) : 0,
                totalSessions: perf ? perf.totalSessions : 0,
                ordersToday: orders ? orders.count : 0,
                callsToday: calls ? calls.count : 0
            };
        });

        const totalTables = hallData.length;
        const occupiedCount = hallData.filter(t => t.status === 'occupied').length;
        const freeCount = hallData.filter(t => t.status === 'free').length;
        const waitingCount = hallData.filter(t => t.status === 'cleaning' || t.status === 'reserved').length;

        const avgTurnover = tablePerformance.length > 0
            ? Math.round(tablePerformance.reduce((acc, curr) => acc + curr.avgDuration, 0) / tablePerformance.length)
            : 0;

        // 4. Find Most Requested Table (Historical orders + calls)
        const historicalOrders = await Order.aggregate([
            { $match: { restaurant: restaurantId, status: { $ne: 'cancelled' } } },
            { $group: { _id: "$table", count: { $count: {} } } }
        ]);

        const historicalCalls = await WaiterCall.aggregate([
            { $match: { restaurant: restaurantId } },
            { $group: { _id: "$table", count: { $count: {} } } }
        ]);

        let mostRequestedTable = null;
        let maxRequests = -1;

        hallData.forEach(t => {
            const hOrders = historicalOrders.find(o => o._id?.toString() === t._id.toString());
            const hCalls = historicalCalls.find(c => c._id?.toString() === t._id.toString());
            const totalRequests = (hOrders ? hOrders.count : 0) + (hCalls ? hCalls.count : 0);

            if (totalRequests > maxRequests) {
                maxRequests = totalRequests;
                mostRequestedTable = {
                    number: t.number,
                    requests: totalRequests
                };
            }
        });

        res.json({
            summary: {
                totalTables,
                occupiedCount,
                freeCount,
                waitingCount,
                avgTurnover,
                mostRequestedTable
            },
            tables: hallData
        });
    } catch (error) {
        console.error('Hall analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch hall analytics' });
    }
};

export const getTableCustomerHistory = async (req, res) => {
    try {
        const { id, tableId } = req.params;
        const restaurantId = new mongoose.Types.ObjectId(id);
        const targetTableId = new mongoose.Types.ObjectId(tableId);

        // Get customers who ordered at this table
        const history = await Order.aggregate([
            { $match: { restaurant: restaurantId, table: targetTableId, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: "$phone",
                    name: { $first: "$customerName" },
                    phone: { $first: "$phone" },
                    lastVisit: { $max: "$createdAt" },
                    totalSpent: { $sum: "$total" },
                    orderCount: { $count: {} }
                }
            },
            { $sort: { lastVisit: -1 } }
        ]);

        res.json(history);
    } catch (error) {
        console.error('Table customer history error:', error);
        res.status(500).json({ error: 'Failed to fetch table customer history' });
    }
};

/**
 * NEW: Cash Flow Report (Relatório de Fluxo de Caixa)
 * Entradas vs Saídas, Saldo Diário
 */
export const getCashFlowReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(id);

        const filter = { restaurant: restaurantId };
        if (startDate && endDate) {
            filter.date = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        } else {
            filter.date = { $gte: subDays(new Date(), 30) };
        }

        const AccountingTransaction = mongoose.model('AccountingTransaction');

        const transactions = await AccountingTransaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    entradas: {
                        $sum: {
                            $reduce: {
                                input: "$items",
                                initialValue: 0,
                                in: { $add: ["$$value", { $ifNull: ["$$this.credit", 0] }] }
                            }
                        }
                    },
                    saidas: {
                        $sum: {
                            $reduce: {
                                input: "$items",
                                initialValue: 0,
                                in: { $add: ["$$value", { $ifNull: ["$$this.debit", 0] }] }
                            }
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Calculate cumulative balance
        let balance = 0;
        const dailyData = transactions.map(t => {
            balance += (t.entradas - t.saidas);
            return {
                ...t,
                date: t._id,
                balance
            };
        });

        res.json({
            summary: {
                totalEntradas: dailyData.reduce((s, i) => s + i.entradas, 0),
                totalSaidas: dailyData.reduce((s, i) => s + i.saidas, 0),
                netBalance: balance
            },
            daily: dailyData
        });
    } catch (error) {
        console.error('Cash Flow Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch cash flow report' });
    }
};

/**
 * NEW: Profit Report (Relatório de Lucro)
 * Revenue - COGS - Expenses
 */
export const getProfitReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(id);

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        } else {
            dateFilter.createdAt = { $gte: subDays(new Date(), 30) };
        }

        // 1. Revenue & Order Count
        const revenueStats = await Order.aggregate([
            { $match: { restaurant: restaurantId, status: { $ne: 'cancelled' }, ...dateFilter } },
            { $group: { _id: null, revenue: { $sum: "$total" }, count: { $count: {} } } }
        ]);

        // 2. COGS (Cost of Goods Sold)
        const cogsStats = await Order.aggregate([
            { $match: { restaurant: restaurantId, status: { $ne: 'cancelled' }, ...dateFilter } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.item",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            { $group: { _id: null, totalCost: { $sum: { $multiply: ["$items.qty", { $ifNull: ["$product.costPrice", 0] }] } } } }
        ]);

        // 3. Other Expenses (from AccountingTransactions)
        const AccountingTransaction = mongoose.model('AccountingTransaction');
        const expenseFilter = { 
            restaurant: restaurantId,
            referenceType: 'expense'
        };
        if (startDate && endDate) {
            expenseFilter.date = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        }

        const otherExpenses = await AccountingTransaction.aggregate([
            { $match: expenseFilter },
            { $unwind: "$items" },
            { $group: { _id: null, total: { $sum: "$items.debit" } } }
        ]);

        const revenue = revenueStats[0]?.revenue || 0;
        const cogs = cogsStats[0]?.totalCost || 0;
        const expenses = otherExpenses[0]?.total || 0;
        const netProfit = revenue - cogs - expenses;

        res.json({
            revenue,
            cogs,
            grossProfit: revenue - cogs,
            otherExpenses: expenses,
            netProfit,
            profitMargin: revenue > 0 ? (netProfit / revenue * 100).toFixed(2) : 0
        });
    } catch (error) {
        console.error('Profit Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch profit report' });
    }
};

/**
 * NEW: Orders Report (Relatório de Pedidos)
 * Status, Sources, Cancellations
 */
export const getOrdersReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(id);

        const filter = { restaurant: restaurantId };
        if (startDate && endDate) {
            filter.createdAt = {
                $gte: startOfDay(new Date(startDate)),
                $lte: endOfDay(new Date(endDate))
            };
        } else {
            filter.createdAt = { $gte: subDays(new Date(), 30) };
        }

        const byStatus = await Order.aggregate([
            { $match: filter },
            { $group: { _id: "$status", count: { $count: {} }, value: { $sum: "$total" } } }
        ]);

        const bySource = await Order.aggregate([
            { $match: filter },
            { $group: { _id: "$source", count: { $count: {} }, value: { $sum: "$total" } } }
        ]);

        const byType = await Order.aggregate([
            { $match: filter },
            { $group: { _id: "$orderType", count: { $count: {} }, value: { $sum: "$total" } } }
        ]);

        res.json({
            byStatus,
            bySource,
            byType,
            total: byStatus.reduce((acc, curr) => acc + curr.count, 0)
        });
    } catch (error) {
        console.error('Orders Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch orders report' });
    }
};
