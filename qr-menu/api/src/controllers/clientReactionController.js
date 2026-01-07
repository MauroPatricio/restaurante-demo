import ClientReaction from '../models/ClientReaction.js';
import Table from '../models/Table.js';

// Create a client reaction
export const createReaction = async (req, res) => {
    try {
        const { tableId, reactionType, comment } = req.body;

        if (!tableId || !reactionType) {
            return res.status(400).json({
                error: 'Table ID and reaction type are required'
            });
        }

        if (!['satisfied', 'dissatisfied'].includes(reactionType)) {
            return res.status(400).json({
                error: 'Invalid reaction type. Must be "satisfied" or "dissatisfied"'
            });
        }

        // Get table details
        const table = await Table.findById(tableId)
            .populate('restaurant', 'name')
            .populate('assignedWaiter', 'name');

        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }

        // Create the reaction
        const reaction = await ClientReaction.create({
            table: tableId,
            waiter: table.assignedWaiter?._id,
            restaurant: table.restaurant._id,
            reactionType,
            comment: comment || '',
            metadata: {
                tableNumber: table.number,
                waiterName: table.assignedWaiter?.name || 'Unassigned'
            }
        });

        // Populate for response
        await reaction.populate(['table', 'waiter', 'restaurant']);

        // Emit Socket.IO event
        if (req.io) {
            req.io.to(`restaurant:${table.restaurant._id}`).emit('client:reaction', {
                reactionId: reaction._id,
                tableId: table._id,
                tableNumber: table.number,
                reactionType: reaction.reactionType,
                waiterName: reaction.metadata.waiterName,
                createdAt: reaction.createdAt
            });
        }

        res.status(201).json({
            success: true,
            message: 'Reaction registered successfully',
            reaction
        });
    } catch (error) {
        console.error('Create reaction error:', error);
        res.status(500).json({ error: 'Failed to create reaction' });
    }
};

// Get reactions
export const getReactions = async (req, res) => {
    try {
        const { restaurantId, waiterId, startDate, endDate, reactionType, limit = 50 } = req.query;

        if (!restaurantId) {
            return res.status(400).json({ error: 'Restaurant ID is required' });
        }

        const query = { restaurant: restaurantId };

        if (waiterId) {
            query.waiter = waiterId;
        }

        if (reactionType) {
            query.reactionType = reactionType;
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const reactions = await ClientReaction.find(query)
            .populate('table', 'number location')
            .populate('waiter', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: reactions.length,
            reactions
        });
    } catch (error) {
        console.error('Get reactions error:', error);
        res.status(500).json({ error: 'Failed to get reactions' });
    }
};

// Get waiter satisfaction stats
export const getWaiterStats = async (req, res) => {
    try {
        const { waiterId, startDate, endDate } = req.query;

        if (!waiterId) {
            return res.status(400).json({ error: 'Waiter ID is required' });
        }

        const stats = await ClientReaction.getSatisfactionRate(
            waiterId,
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null
        );

        res.json({
            success: true,
            waiterId,
            stats
        });
    } catch (error) {
        console.error('Get waiter stats error:', error);
        res.status(500).json({ error: 'Failed to get waiter stats' });
    }
};

// Get restaurant satisfaction stats
export const getRestaurantStats = async (req, res) => {
    try {
        const { restaurantId, startDate, endDate } = req.query;

        if (!restaurantId) {
            return res.status(400).json({ error: 'Restaurant ID is required' });
        }

        const stats = await ClientReaction.getRestaurantStats(
            restaurantId,
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null
        );

        res.json({
            success: true,
            restaurantId,
            stats
        });
    } catch (error) {
        console.error('Get restaurant stats error:', error);
        res.status(500).json({ error: 'Failed to get restaurant stats' });
    }
};
