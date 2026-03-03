import mongoose from 'mongoose';
import User from './src/models/User.js';
import Restaurant from './src/models/Restaurant.js';
import Subscription from './src/models/Subscription.js';
import Role from './src/models/Role.js';
import UserRestaurantRole from './src/models/UserRestaurantRole.js';
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected');

        const mauro = await User.findOne({ name: /Mauro/i });
        if (!mauro) {
            console.log('User Mauro not found');
        } else {
            console.log(`Found User: ${mauro.name} (${mauro.email}) ID: ${mauro._id}`);
            const roles = await UserRestaurantRole.find({ user: mauro._id }).populate('restaurant').populate('role');
            for (const r of roles) {
                console.log(`\nRestaurant: ${r.restaurant?.name} (${r.restaurant?._id})`);
                console.log(`Role: ${r.role?.name} (${r.role?._id})`);

                if (r.restaurant?.subscription) {
                    const sub = await Subscription.findById(r.restaurant.subscription);
                    console.log(`Subscription Status: ${sub?.status}`);
                    console.log(`Valid: ${sub?.isValid()}`);
                    console.log(`Expires: ${sub?.currentPeriodEnd}`);
                } else {
                    console.log('No subscription linked');
                }
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
diagnose();
