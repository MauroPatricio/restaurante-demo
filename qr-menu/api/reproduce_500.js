import mongoose from 'mongoose';
import { getAccountingStats, getCashSessions } from './src/controllers/accountingController.js';
import User from './src/models/User.js';
import Restaurant from './src/models/Restaurant.js';
import Subscription from './src/models/Subscription.js';
import dotenv from 'dotenv';
dotenv.config();

async function reproduce() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find a user and their restaurant
        const user = await User.findOne({ email: 'owner@example.com' });
        const restaurant = await Restaurant.findOne({ name: 'Cerveja' });

        if (!user || !restaurant) {
            console.error('Test data not found');
            process.exit(1);
        }

        console.log(`Testing for User: ${user.email}, Restaurant: ${restaurant.name}`);

        // Mock req and res for getAccountingStats
        const reqStats = {
            user: { _id: user._id, restaurant: restaurant._id },
            restaurant: restaurant
        };
        const resStats = {
            json: (data) => console.log('Stats Success:', data),
            status: (code) => ({
                json: (data) => console.log(`Stats Error (${code}):`, data)
            })
        };

        console.log('\n--- Calling getAccountingStats ---');
        await getAccountingStats(reqStats, resStats);

        // Mock req and res for getCashSessions
        const reqSessions = {
            restaurant: restaurant
        };
        const resSessions = {
            json: (data) => console.log('Sessions Success:', data.sessions.length, 'sessions found'),
            status: (code) => ({
                json: (data) => console.log(`Sessions Error (${code}):`, data)
            })
        };

        console.log('\n--- Calling getCashSessions ---');
        await getCashSessions(reqSessions, resSessions);

        process.exit(0);
    } catch (error) {
        console.error('Reproduction Script Failed:', error);
        process.exit(1);
    }
}

reproduce();
