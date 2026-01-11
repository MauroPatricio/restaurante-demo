import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import mongoose from 'mongoose';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import MenuItem from '../models/MenuItem.js';
import WaiterCall from '../models/WaiterCall.js';
import Table from '../models/Table.js';
import TableSession from '../models/TableSession.js';

export const getOwnerStats = async (req, res) => {
    try {
        const ownerId = req.user._id;

        // 1. Get all restaurants owned by user
        const restaurants = await Restaurant.find({ owner: ownerId }).select('_id name settings');
        const restaurantIds = restaurants.map(r => r._id);

        if (restaurantIds.length === 0) {
            return res.json({
                totalRevenue: 0,
                totalOrders: 0,
                activeRestaurants: 0,
                revenueByRestaurant: []
            });
        }

        // 2. Aggregate Global Stats (Revenue & Orders)
        const globalStats = await Order.aggregate([
            { $match: { restaurant: { $in: restaurantIds }, status: { $ne: 'cancelled' } } },
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
            { $match: { restaurant: { $in: restaurantIds }, status: { $ne: 'cancelled' } } },
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
                orders: stats ? stats.orders : 0
            };
        }).sort((a, b) => b.revenue - a.revenue);

        res.json({
            totalRevenue: globalStats[0]?.totalRevenue || 0,
            totalOrders: globalStats[0]?.totalOrders || 0,
            activeRestaurants: restaurants.length,
            revenueByRestaurant: revenueData
        });

    } catch (error) {
        console.error('Owner stats error:', error);
        res.status(500).json({ error: 'Failed to fetch owner stats' });
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
                $gte: new Date(startDate),
                $lte: new Date(endDate)
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
            restaurant: id,
            status: { $in: ['pending', 'confirmed', 'preparing'] }
        });

        // 2. Pending Orders: 'pending', 'confirmed'
        const pendingOrdersCount = await Order.countDocuments({
            restaurant: id,
            status: { $in: ['pending', 'confirmed'] }
        });

        // 3. Completed Orders: 'ready', 'completed' (Matching the date filter of the report, typically today)
        const completedOrdersCount = await Order.countDocuments({
            restaurant: id,
            status: { $in: ['ready', 'completed'] },
            createdAt: query.createdAt // Apply same date filter
        });

        // 4. Occupied Tables: Count distinct tables in active/open orders
        const occupiedTablesResult = await Order.distinct('table', {
            restaurant: id,
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } // 'ready' means they haven't paid/left yet usually
        });
        const occupiedTablesCount = occupiedTablesResult.length;

        // 5. Active Waiter Calls
        const activeWaiterCallsCount = await WaiterCall.countDocuments({
            restaurant: id,
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
            { $match: { ...query, phone: { $exists: true, $ne: null } } },
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
                peakHours: formattedPeakHours
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
                $gte: new Date(startDate),
                $lte: new Date(endDate)
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
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
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
                $group: {
                    _id: { $ifNull: ["$product.name", "Unknown Item"] },
                    revenue: { $sum: "$items.subtotal" },
                    count: { $sum: "$items.quantity" },
                    category: { $first: "$product.category" }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            byCategory: salesByCategory,
            topItems: topItems
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
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
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
                                { case: { $and: [{ $gte: ["$hour", 6] }, { $lt: ["$hour", 12] }] }, then: "Morning" },
                                { case: { $and: [{ $gte: ["$hour", 12] }, { $lt: ["$hour", 18] }] }, then: "Afternoon" }
                            ],
                            default: "Night"
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

        res.json({
            shifts,
            busiestDays
        });

    } catch (error) {
        console.error('Operational Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch operational report' });
    }
};



export const getInventoryReport = async (req, res) => {
    try {
        const { id } = req.params;

        const items = await MenuItem.find({ restaurant: id });

        const stockStatus = items.map(item => ({
            _id: item._id,
            name: item.name,
            stock: item.stock || 0,
            costPrice: item.costPrice || 0,
            totalValue: (item.stock || 0) * (item.costPrice || 0),
            status: (item.stock || 0) < 10 ? 'Low' : 'OK'
        }));

        const totalStockValue = stockStatus.reduce((sum, item) => sum + item.totalValue, 0);
        const lowStockCount = stockStatus.filter(i => i.status === 'Low').length;

        res.json({
            summary: {
                totalValue: totalStockValue,
                lowStockCount: lowStockCount,
                totalItems: items.length
            },
            items: stockStatus.sort((a, b) => a.stock - b.stock)
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
            { $match: { restaurant: restaurantId, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: "$phone",
                    name: { $first: "$customerName" },
                    totalSpent: { $sum: "$total" },
                    orderCount: { $count: {} },
                    lastVisit: { $max: "$createdAt" },
                    firstVisit: { $min: "$createdAt" }
                }
            },
            { $sort: { totalSpent: -1 } }
        ]);

        const favorites = await Order.aggregate([
            { $match: { restaurant: restaurantId, status: { $ne: 'cancelled' } } },
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
                isRecurring: c.orderCount > 1
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
