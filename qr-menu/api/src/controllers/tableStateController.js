import Table from '../models/Table.js';
import TableSession from '../models/TableSession.js';
import Order from '../models/Order.js';

/**
 * Get current session with all orders for a table
 */
export const getTableCurrentSession = async (req, res) => {
    try {
        const { id } = req.params;

        const table = await Table.findById(id)
            .populate('currentSessionId')
            .populate('statusChangedBy', 'name email');

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        let session = null;
        let orders = [];

        if (table.currentSessionId) {
            session = await TableSession.findById(table.currentSessionId)
                .populate('startedBy', 'name email role')
                .populate('endedBy', 'name email role');

            orders = await Order.find({ tableSession: table.currentSessionId })
                .populate('items.item', 'name price')
                .sort({ createdAt: -1 });
        }

        res.json({
            table: {
                _id: table._id,
                number: table.number,
                status: table.status,
                location: table.location,
                capacity: table.capacity,
                lastStatusChange: table.lastStatusChange,
                statusChangedBy: table.statusChangedBy
            },
            session,
            orders,
            stats: {
                orderCount: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
                sessionDuration: session && session.startedAt
                    ? Math.floor((new Date() - new Date(session.startedAt)) / 1000 / 60) // minutes
                    : 0
            }
        });
    } catch (error) {
        console.error('Error getting table session:', error);
        res.status(500).json({ message: 'Failed to get table session' });
    }
};

/**
 * Free a table (transition from occupied to free)
 * Only managers and waiters can perform this action
 */
export const freeTable = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId; // From auth middleware

        const table = await Table.findById(id);

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        if (table.status !== 'occupied') {
            return res.status(400).json({
                message: `Table is currently ${table.status}, not occupied`
            });
        }

        // Close current session
        if (table.currentSessionId) {
            const session = await TableSession.findById(table.currentSessionId);

            if (session && session.status === 'active') {
                // Get all orders for revenue calculation
                const orders = await Order.find({ tableSession: session._id });
                const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

                session.endedAt = new Date();
                session.endedBy = userId;
                session.status = 'closed';
                session.totalRevenue = totalRevenue;
                session.orderCount = orders.length;
                await session.save();
            }
        }

        // Update table status
        table.status = 'free';
        table.currentSessionId = null;
        table.lastStatusChange = new Date();
        table.statusChangedBy = userId;
        await table.save();

        res.json({
            message: 'Table freed successfully',
            table: {
                _id: table._id,
                number: table.number,
                status: table.status,
                lastStatusChange: table.lastStatusChange
            }
        });
    } catch (error) {
        console.error('Error freeing table:', error);
        res.status(500).json({ message: 'Failed to free table' });
    }
};

/**
 * Occupy a table and create a new session
 * This is called automatically when creating an order
 */
export const occupyTable = async (tableId, userId, restaurantId) => {
    try {
        const table = await Table.findById(tableId);

        if (!table) {
            throw new Error('Table not found');
        }

        // If already occupied with active session, return existing session
        if (table.status === 'occupied' && table.currentSessionId) {
            const existingSession = await TableSession.findById(table.currentSessionId);
            if (existingSession && existingSession.status === 'active') {
                return existingSession;
            }
        }

        // Create new session
        const session = new TableSession({
            table: tableId,
            restaurant: restaurantId,
            startedAt: new Date(),
            startedBy: userId,
            status: 'active'
        });

        await session.save();

        // Update table
        table.status = 'occupied';
        table.currentSessionId = session._id;
        table.occupiedAt = new Date();
        table.lastStatusChange = new Date();
        table.statusChangedBy = userId;
        await table.save();

        return session;
    } catch (error) {
        console.error('Error occupying table:', error);
        throw error;
    }
};

/**
 * Get session history for a table
 */
export const getTableSessionHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10, page = 1 } = req.query;

        const table = await Table.findById(id);

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        const sessions = await TableSession.find({
            table: id,
            status: 'closed'
        })
            .populate('startedBy', 'name email role')
            .populate('endedBy', 'name email role')
            .sort({ endedAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await TableSession.countDocuments({
            table: id,
            status: 'closed'
        });

        res.json({
            sessions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting session history:', error);
        res.status(500).json({ message: 'Failed to get session history' });
    }
};
