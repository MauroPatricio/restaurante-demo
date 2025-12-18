import mongoose from 'mongoose';

const SubscriptionTransactionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'MT'
    },
    method: {
        type: String,
        enum: ['mpesa', 'emola', 'bci'],
        required: true
    },
    reference: {
        type: String, // Phone number or Bank Ref
        required: true
    },
    proofUrl: {
        type: String // URL to uploaded receipt for BCI
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: Date,
    rejectionReason: String
}, { timestamps: true });

export default mongoose.model('SubscriptionTransaction', SubscriptionTransactionSchema);
