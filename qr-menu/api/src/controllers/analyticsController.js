import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import mongoose from 'mongoose';
import { startOfDay, endOfDay, subDays } from 'date-fns';

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
