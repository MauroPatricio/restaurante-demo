import mongoose from 'mongoose';

const WaiterCallSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['call', 'payment_request'],
        default: 'call',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'acknowledged', 'resolved'],
        default: 'pending',
        required: true,
        index: true
    },
    acknowledgedAt: {
        type: Date
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Metadata for quick access without populating
    metadata: {
        tableNumber: String,
        waiterName: String,
        customerName: String,
        restaurantName: String
    }
}, {
    timestamps: true
});

// Index for querying active calls
WaiterCallSchema.index({ restaurant: 1, status: 1, createdAt: -1 });

// Index for cleanup of old calls
WaiterCallSchema.index({ createdAt: 1 });

// Method to check if call is still active
WaiterCallSchema.methods.isActive = function () {
    return this.status === 'pending' || this.status === 'acknowledged';
};

// Method to acknowledge call
WaiterCallSchema.methods.acknowledge = async function (userId) {
    this.status = 'acknowledged';
    this.acknowledgedAt = new Date();
    this.acknowledgedBy = userId;
    return await this.save();
};

// Method to resolve call
WaiterCallSchema.methods.resolve = async function (userId) {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    return await this.save();
};

// Static method to get active calls for a restaurant
WaiterCallSchema.statics.getActiveCalls = function (restaurantId, waiterId = null) {
    const query = {
        restaurant: restaurantId,
        status: { $in: ['pending', 'acknowledged'] }
    };

    if (waiterId) {
        query.$or = [
            { waiter: waiterId },
            { waiter: null },
            { waiter: { $exists: false } }
        ];
    }

    return this.find(query)
        .populate('table', 'number location')
        .populate('waiter', 'name')
        .sort({ createdAt: 1 }); // Oldest first for priority
};

// Static method to cleanup old resolved calls (older than 24 hours)
WaiterCallSchema.statics.cleanupOldCalls = async function () {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.deleteMany({
        status: 'resolved',
        resolvedAt: { $lt: oneDayAgo }
    });

    return result.deletedCount;
};

export default mongoose.model('WaiterCall', WaiterCallSchema);
