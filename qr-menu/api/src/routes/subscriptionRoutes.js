import express from 'express';
import Subscription from '../models/Subscription.js';
import Restaurant from '../models/Restaurant.js';
import Payment from '../models/Payment.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get subscription status for restaurant
router.get('/:restaurantId', authenticateToken, async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Ensure user has access to this restaurant
        if (req.user.restaurant.toString() !== restaurantId && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        const subscription = await Subscription.findById(restaurant.subscription);

        if (!subscription) {
            return res.status(404).json({ error: 'No subscription found' });
        }

        res.json({
            subscription: {
                status: subscription.status,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                amount: subscription.amount,
                currency: subscription.currency,
                graceEndDate: subscription.graceEndDate,
                isValid: subscription.isValid(),
                isTrial: subscription.isTrialPeriod()
            }
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Get payment history
router.get('/:restaurantId/history', authenticateToken, async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Ensure user has access
        if (req.user.restaurant.toString() !== restaurantId && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const payments = await Payment.find({
            restaurant: restaurantId,
            type: 'subscription',
            status: 'completed'
        }).sort({ createdAt: -1 });

        res.json({ payments });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

// Record subscription payment (manual)
router.post('/payment', authenticateToken, authorizeRoles('owner', 'admin'), async (req, res) => {
    try {
        const { restaurantId, paymentReference } = req.body;

        // Verify payment exists and is completed
        const payment = await Payment.findOne({
            reference: paymentReference,
            restaurant: restaurantId,
            type: 'subscription'
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({ error: 'Payment not completed yet' });
        }

        const subscription = await Subscription.findOne({ restaurant: restaurantId });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Update subscription
        const now = new Date();
        const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        subscription.status = 'active';
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = nextPeriodEnd;
        subscription.graceEndDate = null;

        // Reset reminder flags
        subscription.remindersSent = {
            sevenDays: false,
            threeDays: false,
            oneDay: false,
            overdue: false
        };

        // Add to payment history
        subscription.paymentHistory.push({
            date: now,
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
            status: 'completed'
        });

        await subscription.save();

        // Reactivate restaurant if suspended
        const restaurant = await Restaurant.findById(restaurantId);
        if (restaurant && !restaurant.active) {
            restaurant.active = true;
            await restaurant.save();
        }

        res.json({
            message: 'Subscription renewed successfully',
            subscription: {
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd
            }
        });
    } catch (error) {
        console.error('Record subscription payment error:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

export default router;
