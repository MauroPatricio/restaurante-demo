import express from 'express';
import Feedback from '../models/Feedback.js';
import Order from '../models/Order.js';
import { authenticateToken, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Submit customer feedback
router.post('/', async (req, res) => {
    try {
        const { orderId, emotions, rating, comment, aspects } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID required' });
        }

        // Verify order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if feedback already exists for this order
        const existingFeedback = await Feedback.findOne({ order: orderId });
        if (existingFeedback) {
            return res.status(400).json({ error: 'Feedback already submitted for this order' });
        }

        const feedback = await Feedback.create({
            order: orderId,
            restaurant: order.restaurant,
            emotions,
            rating,
            comment,
            aspects
        });

        // Update order with feedback reference
        order.feedback = feedback._id;
        await order.save();

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedback
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// Get all feedback for a restaurant
router.get('/:restaurantId', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const feedbacks = await Feedback.find({ restaurant: restaurantId })
            .populate('order', 'items total createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Feedback.countDocuments({ restaurant: restaurantId });

        res.json({
            feedbacks,
            total,
            hasMore: skip + feedbacks.length < total
        });
    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Get feedback statistics
router.get('/:restaurantId/stats', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Aggregate feedback statistics
        const stats = await Feedback.aggregate([
            { $match: { restaurant: restaurantId } },
            {
                $group: {
                    _id: null,
                    totalFeedbacks: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                    avgFoodRating: { $avg: '$aspects.food' },
                    avgServiceRating: { $avg: '$aspects.service' },
                    avgAmbianceRating: { $avg: '$aspects.ambiance' },
                    avgSpeedRating: { $avg: '$aspects.speed' }
                }
            }
        ]);

        // Count emotions
        const emotionCounts = await Feedback.aggregate([
            { $match: { restaurant: restaurantId } },
            { $unwind: '$emotions' },
            {
                $group: {
                    _id: '$emotions',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Rating distribution
        const ratingDistribution = await Feedback.aggregate([
            { $match: { restaurant: restaurantId } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            overall: stats[0] || {},
            emotions: emotionCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            ratingDistribution
        });
    } catch (error) {
        console.error('Get feedback stats error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback statistics' });
    }
});

export default router;
