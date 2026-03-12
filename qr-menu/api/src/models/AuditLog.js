import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            // Subscription
            'subscription_status_change',
            'subscription_create',
            'subscription_update',
            'subscription_delete',
            // User management
            'user_create',
            'user_update',
            'user_delete',
            // Restaurant
            'restaurant_create',
            'restaurant_update',
            'restaurant_delete',
            // System
            'update_system_setting',
            // Accounting – Accounts
            'accounting_account_create',
            'accounting_account_update',
            'account_create',    // alias used in accountingController
            'account_update',    // alias used in accountingController
            // Accounting – Transactions
            'accounting_transaction_create',
            'accounting_transaction_void',
            'transaction_void',              // alias used in accountingController
            'manual_accounting_transaction', // manual entries
            'purchase_entry',                // purchase journals
            // Cash
            'cash_session_open',
            'cash_session_close',
            // Fiscal
            'fiscal_invoice_generate',
            'fiscal_invoice_void'
        ],
        index: true
    },
    targetModel: {
        type: String,
        required: true,
        enum: ['Subscription', 'User', 'Restaurant', 'Order', 'Table', 'SystemSetting', 'Account', 'AccountingTransaction', 'FiscalInvoice', 'CashSession']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    changes: {
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        restaurantId: mongoose.Schema.Types.ObjectId
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

// Index for querying logs by target
AuditLogSchema.index({ targetModel: 1, targetId: 1, timestamp: -1 });

// Index for querying logs by user and time
AuditLogSchema.index({ user: 1, timestamp: -1 });

// Static method to create audit log
AuditLogSchema.statics.log = async function (data) {
    return await this.create({
        user: data.userId,
        action: data.action,
        targetModel: data.targetModel,
        targetId: data.targetId,
        changes: data.changes || {},
        metadata: {
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            restaurantId: data.restaurantId
        }
    });
};

export default mongoose.model('AuditLog', AuditLogSchema);
