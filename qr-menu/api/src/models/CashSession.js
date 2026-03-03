import mongoose from 'mongoose';

const CashSessionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    operator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    endTime: Date,
    openingBalance: {
        type: Number,
        required: true,
        default: 0
    },
    closingBalance: Number, // Calculated balance based on transactions
    actualBalance: Number,  // Counted balance by operator
    difference: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'cancelled'],
        default: 'open'
    },
    transactions: [{
        type: { type: String, enum: ['sale', 'entry', 'exit', 'refund'] },
        amount: Number,
        description: String,
        timestamp: { type: Date, default: Date.now },
        referenceId: mongoose.Schema.Types.ObjectId // Order ID or Expense ID
    }],
    notes: String
}, { timestamps: true });

export default mongoose.model('CashSession', CashSessionSchema);
