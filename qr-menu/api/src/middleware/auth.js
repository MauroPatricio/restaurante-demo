import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to verify JWT token
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Fetch user from database
        const user = await User.findById(decoded.userId).select('-password');

        if (!user || !user.active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Middleware to check user roles
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: roles,
                current: req.user.role
            });
        }

        next();
    };
};

// Middleware to check subscription status
export const checkSubscription = async (req, res, next) => {
    try {
        if (!req.user || !req.user.restaurant) {
            return res.status(400).json({ error: 'Restaurant not associated with user' });
        }

        const Restaurant = (await import('../models/Restaurant.js')).default;
        const Subscription = (await import('../models/Subscription.js')).default;

        const restaurant = await Restaurant.findById(req.user.restaurant).populate('subscription');

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        if (!restaurant.subscription) {
            return res.status(403).json({
                error: 'No active subscription',
                message: 'Please activate your subscription to use this feature'
            });
        }

        const subscription = await Subscription.findById(restaurant.subscription);

        if (!subscription || !subscription.isValid()) {
            return res.status(403).json({
                error: 'Subscription suspended or expired',
                message: 'Please renew your subscription to continue using the service',
                subscription: {
                    status: subscription?.status,
                    endDate: subscription?.currentPeriodEnd
                }
            });
        }

        req.restaurant = restaurant;
        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({ error: 'Failed to verify subscription status' });
    }
};

export default { authenticateToken, authorizeRoles, checkSubscription };
