import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subscription from '../models/Subscription.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

/**
 * Job to check and update expired subscriptions
 * Should be run periodically (e.g., every hour via cron)
 */
async function checkExpiredSubscriptions() {
    try {
        console.log('[Job] Checking for expired subscriptions...');

        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

        const now = new Date();

        // Find subscriptions that are past their end date but not marked as expired
        const expiredSubscriptions = await Subscription.find({
            currentPeriodEnd: { $lt: now },
            status: { $in: ['active', 'trial'] }
        }).populate('restaurant', 'name');

        console.log(`[Job] Found ${expiredSubscriptions.length} subscriptions to expire`);

        for (const subscription of expiredSubscriptions) {
            const oldStatus = subscription.status;

            // Update to expired
            subscription.status = 'expired';
            await subscription.save();

            // Create audit log for automatic expiration
            await AuditLog.create({
                user: null, // System action
                action: 'subscription_status_change',
                targetModel: 'Subscription',
                targetId: subscription._id,
                changes: {
                    oldValue: oldStatus,
                    newValue: 'expired'
                },
                metadata: {
                    ipAddress: 'system',
                    userAgent: 'auto-expiration-job',
                    restaurantId: subscription.restaurant._id
                }
            });

            console.log(`[Job] Expired subscription ${subscription._id} for restaurant: ${subscription.restaurant?.name || subscription.restaurant}`);
        }

        console.log('[Job] Expiration check completed');

        if (process.env.NODE_ENV !== 'production') {
            // Close connection in dev/test mode
            await mongoose.connection.close();
        }

        return expiredSubscriptions.length;
    } catch (error) {
        console.error('[Job] Error checking expired subscriptions:', error);
        throw error;
    }
}

// If running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
    checkExpiredSubscriptions()
        .then((count) => {
            console.log(`[Job] Process completed. Expired ${count} subscriptions.`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Job] Process failed:', error);
            process.exit(1);
        });
}

export default checkExpiredSubscriptions;
