import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from '../src/models/Restaurant.js';
import Subscription from '../src/models/Subscription.js';
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Script to create a test restaurant with an EXPIRING subscription (e.g., 5 days left)
 */
async function setupExpiringTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Get or create a test owner
        let owner = await User.findOne({ email: 'test-owner@example.com' });
        if (!owner) {
            const ownerRole = await Role.findOne({ name: 'Owner' });
            owner = new User({
                name: 'Test Owner Expiring',
                email: 'test-owner@example.com',
                password: 'password123', // Will be hashed by pre-save
                role: ownerRole._id,
                phone: '123456789',
                isActive: true
            });
            await owner.save();
            console.log('Created test owner');
        }

        // 2. Create a test restaurant
        const restaurantCount = await Restaurant.countDocuments();
        const restaurantName = `Expiring Resto ${restaurantCount + 1}`;
        const restaurant = new Restaurant({
            name: restaurantName,
            email: `expiring${restaurantCount + 1}@example.com`,
            owner: owner._id,
            isActive: true,
            phone: '987654321',
            slug: `expiring-resto-${restaurantCount + 1}`
        });

        // 3. Create an EXPIRING subscription (5 days from now)
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

        const subscription = new Subscription({
            restaurant: restaurant._id,
            status: 'active',
            plan: 'premium',
            currentPeriodStart: new Date(),
            currentPeriodEnd: fiveDaysFromNow,
            amount: 1000,
            currency: 'MT'
        });

        await subscription.save();
        restaurant.subscription = subscription._id;
        await restaurant.save();

        console.log(`Setup complete!`);
        console.log(`Restaurant: ${restaurantName}`);
        console.log(`Owner: test-owner@example.com / password123`);
        console.log(`Expiry Date: ${fiveDaysFromNow.toLocaleDateString()}`);

    } catch (error) {
        console.error('Setup failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

setupExpiringTest();
