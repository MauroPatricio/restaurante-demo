import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['order', 'subscription'],
        required: true
    },
    reference: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    method: {
        type: String,
        enum: ['mpesa', 'emola', 'bim', 'bci', 'cash'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'MT'
    },
    receipt: {
        type: String // File path for bank receipt uploads (BIM/BCI)
    },
    metadata: {
        phoneNumber: String, // For Mpesa/eMola
        transactionId: String, // External payment provider transaction ID
        accountNumber: String, // For bank transfers
        receiptNumber: String, // For cash payments
        notes: String
    },
    processedAt: Date,
    failureReason: String
}, { timestamps: true });

// Index for querying payments by restaurant and status
PaymentSchema.index({ restaurant: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', PaymentSchema);
