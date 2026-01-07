import WaiterCall from '../models/WaiterCall.js';
import Table from '../models/Table.js';
import User from '../models/User.js';

// Create a waiter call
export const createWaiterCall = async (req, res) => {
    try {
        const { tableId, type = 'call' } = req.body;

        if (!tableId) {
            return res.status(400).json({ error: 'Table ID is required' });
        }

        // Get table details
        const table = await Table.findById(tableId)
            .populate('restaurant', 'name')
            .populate('assignedWaiter', 'name');

        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }

        // Check if there's already an active call for this table
        const activeCall = await WaiterCall.findOne({
            table: tableId,
            status: { $in: ['pending', 'acknowledged'] }
        });

        if (activeCall) {
            return res.status(409).json({
                error: 'There is already an active call for this table',
                call: activeCall
            });
        }

        // Create the call
        const waiterCall = await WaiterCall.create({
            table: tableId,
            waiter: table.assignedWaiter?._id,
            restaurant: table.restaurant._id,
            type,
            metadata: {
                tableNumber: table.number,
                waiterName: table.assignedWaiter?.name || 'Unassigned',
                restaurantName: table.restaurant.name
            }
        });

        // Populate for response
        await waiterCall.populate(['table', 'waiter', 'restaurant']);

        // Emit Socket.IO event (handled by socket handlers)
        if (req.io) {
            req.io.to(`restaurant:${table.restaurant._id}`).emit('waiter:call', {
                callId: waiterCall._id,
                tableId: table._id,
                tableNumber: table.number,
                waiterName: waiterCall.metadata.waiterName,
                type: waiterCall.type,
                createdAt: waiterCall.createdAt
            });
        }

        res.status(201).json({
            success: true,
            message: 'Waiter call created successfully',
            call: waiterCall
        });
    } catch (error) {
        console.error('Create waiter call error:', error);
        res.status(500).json({ error: 'Failed to create waiter call' });
    }
};

// Get active calls
export const getActiveCalls = async (req, res) => {
    try {
        const { restaurantId, waiterId } = req.query;

        if (!restaurantId) {
            return res.status(400).json({ error: 'Restaurant ID is required' });
        }

        const calls = await WaiterCall.getActiveCalls(restaurantId, waiterId);

        res.json({
            success: true,
            count: calls.length,
            calls
        });
    } catch (error) {
        console.error('Get active calls error:', error);
        res.status(500).json({ error: 'Failed to get active calls' });
    }
};

// Acknowledge a call (stops the alert)
export const acknowledgeCall = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const call = await WaiterCall.findById(id);

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.status !== 'pending') {
            return res.status(400).json({ error: 'Call is not pending' });
        }

        // Acknowledge the call
        await call.acknowledge(userId);

        // Emit Socket.IO event
        if (req.io) {
            req.io.to(`restaurant:${call.restaurant}`).emit('waiter:call:acknowledged', {
                callId: call._id,
                acknowledgedBy: userId,
                acknowledgedAt: call.acknowledgedAt
            });
        }

        res.json({
            success: true,
            message: 'Call acknowledged successfully',
            call
        });
    } catch (error) {
        console.error('Acknowledge call error:', error);
        res.status(500).json({ error: 'Failed to acknowledge call' });
    }
};

// Resolve a call (mark as completed)
export const resolveCall = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const call = await WaiterCall.findById(id);

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.status === 'resolved') {
            return res.status(400).json({ error: 'Call is already resolved' });
        }

        // Resolve the call
        await call.resolve(userId);

        // Emit Socket.IO event
        if (req.io) {
            req.io.to(`restaurant:${call.restaurant}`).emit('waiter:call:resolved', {
                callId: call._id,
                resolvedBy: userId,
                resolvedAt: call.resolvedAt
            });
        }

        res.json({
            success: true,
            message: 'Call resolved successfully',
            call
        });
    } catch (error) {
        console.error('Resolve call error:', error);
        res.status(500).json({ error: 'Failed to resolve call' });
    }
};

// Get call history
export const getCallHistory = async (req, res) => {
    try {
        const { restaurantId, startDate, endDate, limit = 50 } = req.query;

        if (!restaurantId) {
            return res.status(400).json({ error: 'Restaurant ID is required' });
        }

        const query = { restaurant: restaurantId };

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const calls = await WaiterCall.find(query)
            .populate('table', 'number location')
            .populate('waiter', 'name')
            .populate('acknowledgedBy', 'name')
            .populate('resolvedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: calls.length,
            calls
        });
    } catch (error) {
        console.error('Get call history error:', error);
        res.status(500).json({ error: 'Failed to get call history' });
    }
};
