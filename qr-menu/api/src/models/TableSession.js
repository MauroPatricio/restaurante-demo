import mongoose from 'mongoose';

const TableSessionSchema = new mongoose.Schema({
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: true,
        index: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    endedAt: {
        type: Date,
        index: true
    },
    startedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    endedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active',
        index: true
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    orderCount: {
        type: Number,
        default: 0
    },
    notes: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual to populate orders
TableSessionSchema.virtual('orders', {
    ref: 'Order',
    localField: '_id',
    foreignField: 'tableSession'
});

// Indexes for common queries
TableSessionSchema.index({ restaurant: 1, status: 1 });
TableSessionSchema.index({ table: 1, status: 1 });
TableSessionSchema.index({ restaurant: 1, createdAt: -1 });

export default mongoose.model('TableSession', TableSessionSchema);
