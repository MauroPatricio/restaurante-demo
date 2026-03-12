import mongoose from 'mongoose';

const AccountingTransactionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    documentNumber: {
        type: String,
        unique: true,
        sparse: true, // Only for officially fiscalized entries
        index: true
    },
    costCenter: {
        type: String,
        enum: ['Restaurante', 'Clínica', 'Microcrédito', 'Geral'],
        default: 'Geral',
        index: true
    },
    description: {
        type: String,
        required: true
    },
    referenceType: {
        type: String,
        enum: ['order', 'payment', 'expense', 'manual', 'opening_balance', 'stock_adjustment'],
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    sourceType: {
        type: String,
        enum: ['manual', 'order', 'payroll', 'expense', 'stock_restock'],
        default: 'manual'
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    items: [{
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: true
        },
        debit: {
            type: Number,
            default: 0
        },
        credit: {
            type: Number,
            default: 0
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['draft', 'posted', 'voided'],
        default: 'posted'
    },
    vatAmount: {
        type: Number,
        default: 0 // Track the tax portion of this transaction
    },
    isLocked: {
        type: Boolean,
        default: false // Prevent edits after month-end or fiscal submission
    },
    voidReason: String
}, { timestamps: true });

// Total debits must equal total credits
AccountingTransactionSchema.pre('save', function (next) {
    const totalDebit = this.items.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = this.items.reduce((sum, item) => sum + (item.credit || 0), 0);

    // Using a small epsilon for floating point comparison
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
        return next(new Error('Total debits must equal total credits'));
    }
    next();
});

export default mongoose.model('AccountingTransaction', AccountingTransactionSchema);
