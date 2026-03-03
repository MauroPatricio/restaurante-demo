import mongoose from 'mongoose';
import Restaurant from './src/models/Restaurant.js';
import Subscription from './src/models/Subscription.js';
import UserRestaurantRole from './src/models/UserRestaurantRole.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/qr-menu');
        console.log('Connected to MongoDB');

        // Find the last created restaurant or search by name if known
        const restaurants = await Restaurant.find().sort({ createdAt: -1 }).limit(5);

        for (const restaurant of restaurants) {
            console.log(`\n--- Restaurant: ${restaurant.name} (${restaurant._id}) ---`);
            console.log(`Active: ${restaurant.active}`);
            console.log(`Subscription ID: ${restaurant.subscription}`);

            if (restaurant.subscription) {
                const sub = await Subscription.findById(restaurant.subscription);
                if (sub) {
                    const now = new Date();
                    console.log(`  Status: ${sub.status}`);
                    console.log(`  Start: ${sub.currentPeriodStart}`);
                    console.log(`  End: ${sub.currentPeriodEnd}`);
                    console.log(`  Valid: ${sub.isValid()}`);
                    console.log(`  Now: ${now}`);
                    console.log(`  Is Expired: ${sub.isExpired()}`);
                } else {
                    console.log('  Subscription record not found!');
                }
            } else {
                console.log('  No subscription linked.');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Diagnosis failed:', error);
        process.exit(1);
    }
}

diagnose();
