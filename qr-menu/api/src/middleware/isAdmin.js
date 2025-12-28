import UserRestaurantRole from '../models/UserRestaurantRole.js';
import Role from '../models/Role.js';

/**
 * Middleware to verify if user has Admin role
 * Admin is a system-wide role that can manage all restaurants
 */
export const isAdmin = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Find all roles for this user
        const userRoles = await UserRestaurantRole.find({ user: userId })
            .populate('role');

        // Check if user has Admin role (system role)
        const hasAdminRole = userRoles.some(ur => {
            return ur.role && ur.role.name === 'Admin' && ur.role.isSystem === true;
        });

        if (!hasAdminRole) {
            // Log unauthorized access attempt
            console.warn(`Unauthorized admin access attempt by user ${userId}`);

            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        // User is admin, proceed
        req.isAdmin = true;
        next();
    } catch (error) {
        console.error('Error in isAdmin middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying admin privileges'
        });
    }
};

export default isAdmin;
