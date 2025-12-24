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

        // Import Role and UserRestaurantRole dynamically to avoid circular dependency issues if any
        const UserRestaurantRole = (await import('../models/UserRestaurantRole.js')).default;

        // Fetch user from database (role is no longer directly on user)
        const user = await User.findById(decoded.userId).select('-password');

        if (!user || !user.active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = user;

        // Extract restaurant scope if present
        if (decoded.restaurantId) {
            req.restaurantId = decoded.restaurantId; // Keep independent reference

            // Fetch Context-Specific Role
            const userRole = await UserRestaurantRole.findOne({
                user: user._id,
                restaurant: decoded.restaurantId,
                active: true
            }).populate('role');

            if (userRole) {
                // Attach role to user object for authorizeRoles middleware compatibility
                req.user.role = userRole.role;
                req.user.restaurant = decoded.restaurantId; // Attach active context ID
            } else {
                // Token has restaurantId but no active role found (revoked access?)
                return res.status(403).json({ error: 'Access to this restaurant context is no longer valid' });
            }
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Middleware to check user roles
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if role exists and its name matches allowed roles
        // We use case-insensitive check for robustness
        const userRoleName = req.user.role?.name;

        if (!userRoleName || !allowedRoles.some(role => role.toLowerCase() === userRoleName.toLowerCase())) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: userRoleName
            });
        }

        next();
    };
};

// Middleware to check subscription status
export const checkSubscription = async (req, res, next) => {
    try {
        // Strict Check: Require restaurantId in token (Scope Token)
        let restaurantId = req.restaurantId;

        // Allow public access if restaurant ID is provided in body/query (for QR menu orders)
        if (!restaurantId && (req.body.restaurant || req.query.restaurant || req.params.id || req.params.restaurantId)) {
            restaurantId = req.body.restaurant || req.query.restaurant || req.params.id || req.params.restaurantId;
        }

        if (!restaurantId) {
            return res.status(403).json({ error: 'Restaurant context required', code: 'NO_CONTEXT' });
        }

        const Restaurant = (await import('../models/Restaurant.js')).default;
        const Subscription = (await import('../models/Subscription.js')).default;

        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');

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
