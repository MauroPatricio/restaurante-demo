import mongoose from 'mongoose';
import Restaurant from './src/models/Restaurant.js';
import Role from './src/models/Role.js';
import Subscription from './src/models/Subscription.js';
import UserRestaurantRole from './src/models/UserRestaurantRole.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/qr-menu';
        console.log('Connecting to:', uri.split('@').pop()); // Log only the host/db part
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const users = await User.find().limit(5);
        console.log(`Found ${users.length} users.`);
        for (const u of users) {
            console.log(`- User: ${u.email} (${u._id})`);
            const roles = await UserRestaurantRole.find({ user: u._id }).populate('role');
            for (const r of roles) {
                console.log(`  Role: ${r.role?.name} at Restaurant ID: ${r.restaurant}`);
            }
        }

        const restaurants = await Restaurant.find().sort({ createdAt: -1 }).limit(10);
        console.log(`Found ${restaurants.length} restaurants.`);

        for (const restaurant of restaurants) {
            console.log(`\n--- Restaurant: ${restaurant.name} (${restaurant._id}) ---`);
            console.log(`Active: ${restaurant.active}`);
            console.log(`Subscription ID: ${restaurant.subscription}`);

            if (restaurant.subscription) {
                const sub = await Subscription.findById(restaurant.subscription);
                if (sub) {
                    const now = new Date();
                    console.log(`  Status: ${sub.status}`);
                    console.log(`  End: ${sub.currentPeriodEnd}`);
                    console.log(`  Valid: ${sub.isValid()}`);
                    console.log(`  Days until expiry: ${Math.ceil((sub.currentPeriodEnd - now) / (1000 * 60 * 60 * 24))}`);
                } else {
                    console.log('  Subscription record not found in DB!');
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
