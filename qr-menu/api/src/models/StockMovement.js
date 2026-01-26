import mongoose from 'mongoose';

const StockMovementSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true,
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
        enum: ['sale', 'restock', 'adjustment', 'waste', 'return'],
        required: true,
        index: true
    },
    quantityBefore: {
        type: Number,
        required: true
    },
    quantityAfter: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true // Pode ser negativo (venda) ou positivo (reabastecimento)
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    reason: String,
    notes: String,
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for common queries
StockMovementSchema.index({ restaurant: 1, createdAt: -1 });
StockMovementSchema.index({ menuItem: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });

// Virtual for display
StockMovementSchema.virtual('change').get(function () {
    return this.quantityAfter - this.quantityBefore;
});

export default mongoose.model('StockMovement', StockMovementSchema);
