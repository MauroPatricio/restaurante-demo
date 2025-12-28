import Subscription from '../models/Subscription.js';
import UserRestaurantRole from '../models/UserRestaurantRole.js';

/**
 * Middleware to check if user's subscription is active
 * Blocks access if subscription is suspended, cancelled, or expired
 * 
 * Exemptions:
 * - System Admin users (isSystem: true)
 * - Authentication routes
 * - Subscription and payment routes
 */
export const checkSubscription = async (req, res, next) => {
    try {
        // Skip check for system admin
        if (req.user?.role?.isSystem) {
            return next();
        }

        // Get user's restaurant
        const restaurantId = req.user.restaurant;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                blocked: true,
                message: 'No restaurant associated with user'
            });
        }

        // Find subscription for this restaurant
        const subscription = await Subscription.findOne({
            restaurant: restaurantId
        });

        if (!subscription) {
            return res.status(402).json({
                success: false,
                blocked: true,
                status: 'no_subscription',
                message: 'No subscription found. Please contact support.',
                requiresAction: true
            });
        }

        // Check if subscription is active
        const blockedStatuses = ['suspended', 'cancelled', 'expired'];
        const isBlocked = blockedStatuses.includes(subscription.status);

        if (isBlocked) {
            return res.status(402).json({
                success: false,
                blocked: true,
                status: subscription.status,
                message: `Subscription ${subscription.status}. Please renew to continue.`,
                currentPeriodEnd: subscription.currentPeriodEnd,
                daysExpired: subscription.getDaysExpired ? subscription.getDaysExpired() : null,
                requiresAction: true
            });
        }

        // Subscription is active, proceed
        next();
    } catch (error) {
        console.error('Error in checkSubscription middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking subscription status'
        });
    }
};

export default checkSubscription;
