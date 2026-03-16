import Order from '../models/Order.js';
import mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Calculates the average preparation time for orders completed today.
 * Prep time = actualReadyTime - createdAt
 * @param {string} restaurantId 
 * @returns {Promise<number>} Average prep time in minutes
 */
export const calculateTodayAvgPrepTime = async (restaurantId) => {
    try {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const stats = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(restaurantId),
                    status: { $in: ['ready', 'completed', 'served'] },
                    actualReadyTime: { $exists: true },
                    createdAt: { $gte: todayStart, $lte: todayEnd }
                }
            },
            {
                $project: {
                    prepTimeMinutes: {
                        $divide: [
                            { $subtract: ["$actualReadyTime", "$createdAt"] },
                            60000 // ms to minutes
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

        return stats[0] ? Math.round(stats[0].avgPrepTime) : 0;
    } catch (error) {
        console.error('Error calculating average prep time:', error);
        return 0;
    }
};
