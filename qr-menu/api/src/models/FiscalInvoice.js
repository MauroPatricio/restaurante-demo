import mongoose from 'mongoose';

const FiscalInvoiceSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true
    },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    series: {
        type: String, // e.g., '2024' or 'A'
        required: true
    },
    sequence: {
        type: Number,
        required: true
    },
    customer: {
        name: String,
        nuit: String, // NUIT do cliente
        address: String
    },
    items: [{
        name: String,
        qty: Number,
        price: Number,
        taxAmount: Number,
        total: Number
    }],
    subtotal: Number,
    taxTotal: Number,
    total: Number,
    paymentMethod: String,
    status: {
        type: String,
        enum: ['normal', 'voided', 'rectified'],
        default: 'normal'
    },
    voidReason: String,
    voidedAt: Date,
    voidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    hash: {
        type: String, // Integrity hash for audit trail
        required: true
    },
    prevHash: String // Reference to previous invoice hash for blockchain-like chain
}, { timestamps: true });

// Compound index for sequence integrity
FiscalInvoiceSchema.index({ restaurant: 1, series: 1, sequence: 1 }, { unique: true });

export default mongoose.model('FiscalInvoice', FiscalInvoiceSchema);
