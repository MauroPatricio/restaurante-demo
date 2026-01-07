import mongoose from 'mongoose';

const ClientReactionSchema = new mongoose.Schema({
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: true,
        index: true
    },
    waiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    reactionType: {
        type: String,
        enum: ['satisfied', 'dissatisfied'],
        required: true
    },
    comment: {
        type: String,
        maxlength: 500
    },
    // Metadata for quick access
    metadata: {
        tableNumber: String,
        waiterName: String
    }
}, {
    timestamps: true
});

// Index for analytics queries
ClientReactionSchema.index({ restaurant: 1, createdAt: -1 });
ClientReactionSchema.index({ waiter: 1, createdAt: -1 });
ClientReactionSchema.index({ reactionType: 1, createdAt: -1 });

// Static method to get satisfaction rate for a waiter
ClientReactionSchema.statics.getSatisfactionRate = async function (waiterId, startDate, endDate) {
    const query = { waiter: waiterId };

    if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const reactions = await this.find(query);

    if (reactions.length === 0) {
        return {
            totalReactions: 0,
            satisfied: 0,
            dissatisfied: 0,
            satisfactionRate: 0
        };
    }

    const satisfied = reactions.filter(r => r.reactionType === 'satisfied').length;
    const dissatisfied = reactions.filter(r => r.reactionType === 'dissatisfied').length;

    return {
        totalReactions: reactions.length,
        satisfied,
        dissatisfied,
        satisfactionRate: (satisfied / reactions.length) * 100
    };
};

// Static method to get restaurant satisfaction stats
ClientReactionSchema.statics.getRestaurantStats = async function (restaurantId, startDate, endDate) {
    const query = { restaurant: restaurantId };

    if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const reactions = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$reactionType',
                count: { $sum: 1 }
            }
        }
    ]);

    const stats = {
        totalReactions: 0,
        satisfied: 0,
        dissatisfied: 0,
        satisfactionRate: 0
    };

    reactions.forEach(r => {
        stats.totalReactions += r.count;
        if (r._id === 'satisfied') stats.satisfied = r.count;
        if (r._id === 'dissatisfied') stats.dissatisfied = r.count;
    });

    if (stats.totalReactions > 0) {
        stats.satisfactionRate = (stats.satisfied / stats.totalReactions) * 100;
    }

    return stats;
};

export default mongoose.model('ClientReaction', ClientReactionSchema);
