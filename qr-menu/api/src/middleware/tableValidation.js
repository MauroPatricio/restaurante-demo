import Table from '../models/Table.js';
import { occupyTable } from '../controllers/tableStateController.js';

/**
 * Middleware to validate table status before order creation
 * Auto-transitions table to 'occupied' if currently 'free'
 */
export const validateAndOccupyTable = async (req, res, next) => {
    try {
        const { table: tableId, restaurant: restaurantId } = req.body;

        // Skip validation for takeaway and delivery orders
        if (req.body.orderType === 'takeaway' || req.body.orderType === 'delivery') {
            return next();
        }

        // Dine-in orders require a table
        if (!tableId) {
            return res.status(400).json({
                message: 'Table is required for dine-in orders'
            });
        }

        const table = await Table.findById(tableId);

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Check if table is available for orders
        if (table.status === 'closed') {
            return res.status(400).json({
                message: 'This table is currently closed and unavailable for orders'
            });
        }

        if (table.status === 'cleaning') {
            return res.status(400).json({
                message: 'This table is being cleaned. Please wait a moment.'
            });
        }

        // Get userId (could be from authenticated user or system)
        const userId = req.user?.userId || null;

        // If table is free or not occupied, occupy it and create session
        if (table.status === 'free' || !table.currentSessionId) {
            const session = await occupyTable(tableId, userId, restaurantId);
            req.tableSession = session; // Pass session to order controller
        } else if (table.status === 'occupied' && table.currentSessionId) {
            // Table already occupied, use existing session
            req.tableSession = { _id: table.currentSessionId };
        }

        next();
    } catch (error) {
        console.error('Error validating table:', error);
        res.status(500).json({ message: 'Failed to validate table status' });
    }
};

/**
 * Middleware to check if user can free a table
 * Only managers and waiters are allowed
 */
export const canFreeTable = (req, res, next) => {
    const userRole = req.user?.role;

    if (!['manager', 'waiter', 'owner'].includes(userRole)) {
        return res.status(403).json({
            message: 'Only managers and waiters can free tables'
        });
    }

    next();
};
