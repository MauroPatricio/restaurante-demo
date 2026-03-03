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
    // Flatten allowedRoles in case an array was passed as the first argument
    const roles = allowedRoles.flat();

    return (req, res, next) => {
        if (!req.user) {
            console.warn('[Authorize] No user found in request');
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if role exists and its name matches allowed roles
        const rawRole = req.user.role;
        const userRoleName = rawRole?.name || (typeof rawRole === 'string' ? rawRole : null);

        if (!userRoleName) {
            console.warn(`[Authorize] User ${req.user.email} has no valid role name. Raw role:`, JSON.stringify(rawRole));
            return res.status(403).json({ error: 'Role not assigned', current: rawRole });
        }

        const isAuthorized = roles.some(role => {
            if (typeof role !== 'string') return false;
            if (!userRoleName) return false;
            try {
                return role.toLowerCase() === userRoleName.toString().toLowerCase();
            } catch (e) {
                console.error(`[Authorize] Crash during comparison for role "${role}" and userRole "${userRoleName}":`, e.message);
                return false;
            }
        });

        if (!isAuthorized) {
            console.warn(`[Authorize] Forbidden: User ${req.user.email} (${userRoleName}) not in ${roles}`);
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: roles,
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

        // Check if user is Platform SuperAdmin - BYPASS SUBSCRIPTION CHECK
        if (req.user?.role?.name === 'SuperAdmin' || req.user?.role?.name === 'PlatformAdmin') {
            req.restaurant = restaurant; // Still attach restaurant for context
            req.subscription = await Subscription.findById(restaurant.subscription); // Attach subscription if exists, but don't block
            return next();
        }

        if (!restaurant.subscription) {
            return res.status(403).json({
                error: 'No active subscription',
                message: 'Please activate your subscription to use this feature'
            });
        }

        const subscription = await Subscription.findById(restaurant.subscription);

        if (!subscription || !subscription.isValid()) {
            return res.status(402).json({
                error: 'Subscription suspended or expired',
                message: subscription?.status === 'pending_activation'
                    ? 'A sua subscrição está pendente de ativação pelo administrador.'
                    : 'A sua subscrição expirou ou foi suspensa. Por favor, renove para continuar.',
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
        res.status(500).json({
            error: 'Failed to verify subscription status',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Middleware to enforce subscription blocking (blocks all features except payment/subscription routes)
export const enforceSubscription = (options = {}) => {
    return async (req, res, next) => {
        try {
            // Define allowed paths that don't require valid subscription
            const allowedPaths = options.allowedPaths || [
                '/subscription',
                '/payment',
                '/auth/me',
                '/auth/logout',
                '/auth/select-restaurant'
            ];

            // Check if current path is in allowed list
            const isAllowedPath = allowedPaths.some(path => req.path.includes(path));

            if (isAllowedPath) {
                return next();
            }

            // Check if subscription exists and is attached to request
            if (!req.subscription) {
                return res.status(403).json({
                    error: 'NO_SUBSCRIPTION',
                    message: 'Nenhuma subscrição encontrada para este restaurante.',
                    code: 'NO_SUBSCRIPTION'
                });
            }

            // Check if subscription is valid
            if (!req.subscription.isValid()) {
                const daysExpired = req.subscription.getDaysExpired();
                const isInGrace = req.subscription.isInGracePeriod();

                return res.status(402).json({ // 402 Payment Required
                    error: 'SUBSCRIPTION_EXPIRED',
                    message: isInGrace
                        ? 'Subscrição em período de graça. Renove para evitar bloqueio.'
                        : 'Subscrição expirada. Renove para continuar.',
                    subscription: {
                        status: req.subscription.status,
                        endDate: req.subscription.currentPeriodEnd,
                        daysExpired,
                        isInGrace,
                        graceEndDate: req.subscription.graceEndDate
                    },
                    allowedActions: ['view_subscription', 'make_payment']
                });
            }

            // Subscription is valid, proceed
            next();
        } catch (error) {
            console.error('Enforce subscription error:', error);
            res.status(500).json({ error: 'Failed to check subscription enforcement' });
        }
    };
};

export default { authenticateToken, authorizeRoles, checkSubscription, enforceSubscription };
