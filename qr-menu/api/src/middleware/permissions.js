// Middleware to check user permissions
export const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user?.role;

            if (!userRole) {
                return res.status(403).json({ error: 'No role assigned' });
            }

            // Owner and System roles have all permissions
            if (userRole.name === 'Owner' || userRole.isSystem) {
                return next();
            }

            // Check if role has the specific permission
            if (userRole.permissions?.includes(permission) ||
                userRole.permissions?.includes('all')) {
                return next();
            }

            return res.status(403).json({
                error: 'Insufficient permissions',
                required: permission,
                userRole: userRole.name
            });
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ error: 'Permission check failed' });
        }
    };
};

// Middleware to check if user has one of the specified roles
export const authorizeRoles = (...roles) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user?.role;

            if (!userRole) {
                return res.status(403).json({ error: 'No role assigned' });
            }

            // Check if user's role is in the allowed roles
            if (roles.includes(userRole.name) || userRole.isSystem) {
                return next();
            }

            return res.status(403).json({
                error: 'Access denied',
                allowedRoles: roles,
                userRole: userRole.name
            });
        } catch (error) {
            console.error('Role authorization error:', error);
            return res.status(500).json({ error: 'Authorization failed' });
        }
    };
};

// Available permissions
export const PERMISSIONS = {
    MANAGE_USERS: 'manage_users',
    MANAGE_TABLES: 'manage_tables',
    MANAGE_MENU: 'manage_menu',
    VIEW_REPORTS: 'view_reports',
    MANAGE_ORDERS: 'manage_orders',
    MANAGE_STAFF: 'manage_staff',
    ALL: 'all'
};
