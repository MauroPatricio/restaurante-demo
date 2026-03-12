import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
        required: true
    },
    nature: {
        type: String,
        enum: ['debit', 'credit'],
        required: false
        // debit = assets, expenses (increase on debit)
        // credit = liabilities, equity, revenue (increase on credit)
    },
    description: {
        type: String,
        default: ''
    },
    class: {
        type: Number,
        enum: [1, 2, 3, 4, 5, 6, 7, 8], // PGC-NIRF Classes
        required: false
    },
    costCenter: {
        type: String,
        enum: ['Restaurante', 'Clínica', 'Microcrédito', 'Geral'],
        default: 'Geral'
    },
    isTaxAccount: {
        type: Boolean,
        default: false // e.g., 24 - Estado (IVA a Pagar/Dedutível)
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    isGroup: {
        type: Boolean,
        default: false // If true, it can't have direct transactions, only children
    },
    balance: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Ensure code is unique per restaurant
AccountSchema.index({ restaurant: 1, code: 1 }, { unique: true });

export default mongoose.model('Account', AccountSchema);
