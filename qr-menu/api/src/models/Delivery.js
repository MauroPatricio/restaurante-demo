import mongoose from 'mongoose';

const DeliverySchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true,
        index: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    deliveryPerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    address: {
        street: String,
        city: String,
        district: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        instructions: String
    },
    status: {
        type: String,
        enum: ['pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'cancelled'],
        default: 'pending',
        index: true
    },
    estimatedTime: {
        type: Number // minutes
    },
    actualDeliveryTime: Date,
    pickupTime: Date,
    deliveryFee: {
        type: Number,
        default: 0
    },
    distance: {
        type: Number // kilometers
    },
    notes: String,
    statusHistory: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
}, { timestamps: true });

// Index for delivery person queries
DeliverySchema.index({ deliveryPerson: 1, status: 1 });
DeliverySchema.index({ createdAt: -1 });

export default mongoose.model('Delivery', DeliverySchema);
