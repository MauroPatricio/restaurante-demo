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
            'subscription_status_change',
            'subscription_create',
            'subscription_update',
            'subscription_delete',
            'user_create',
            'user_update',
            'user_delete',
            'restaurant_create',
            'restaurant_update',
            'restaurant_delete'
        ],
        index: true
    },
    targetModel: {
        type: String,
        required: true,
        enum: ['Subscription', 'User', 'Restaurant', 'Order', 'Table']
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
