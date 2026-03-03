import mongoose from 'mongoose';
import UserRestaurantRole from './src/models/UserRestaurantRole.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const userId = '69a57af06f300502655fbece';
    const restaurantId = '69524776e905ab64485c048c';

    const role = await UserRestaurantRole.findOne({
        user: userId,
        restaurant: restaurantId
    });

    console.log('Role found:', JSON.stringify(role, null, 2));
    process.exit(0);
}

check();
