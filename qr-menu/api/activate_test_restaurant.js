import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/Projectos/restaurante-demo/qr-menu/api/.env' });

async function activateRestaurant() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // KFC ID from subagent log: 695fe59bd9193b05e3c59209
        const restaurantId = '695fe59bd9193b05e3c59209';

        // Update restaurant status and subscription
        const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}), 'restaurants');
        const Subscription = mongoose.model('Subscription', new mongoose.Schema({}), 'subscriptions');

        await Restaurant.updateOne({ _id: restaurantId }, { $set: { status: 'active' } });
        await Subscription.updateOne({ restaurant: restaurantId }, {
            $set: {
                status: 'active',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        console.log('KFC Restaurant and Subscription activated successfully.');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error activating restaurant:', error);
        process.exit(1);
    }
}

activateRestaurant();
