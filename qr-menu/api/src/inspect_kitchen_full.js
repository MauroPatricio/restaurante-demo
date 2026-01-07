
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Role from './models/Role.js';
import UserRestaurantRole from './models/UserRestaurantRole.js';
import Restaurant from './models/Restaurant.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const inspectUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurante-demo');
        console.log('Connected to MongoDB');

        const email = 'kitchen@example.com';
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            console.log(`❌ User ${email} not found!`);
            await mongoose.disconnect();
            return;
        }

        console.log('✅ User Found:');
        console.log(`  ID: ${user._id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Active: ${user.active}`);
        console.log(`  isDefaultPassword: ${user.isDefaultPassword}`);

        const userRoles = await UserRestaurantRole.find({ user: user._id })
            .populate('restaurant')
            .populate('role');

        console.log(`\n found ${userRoles.length} restaurant associations:`);

        for (const ur of userRoles) {
            console.log(`\n  -- Association ${ur._id} --`);
            console.log(`  Restaurant: ${ur.restaurant?.name} (Active: ${ur.restaurant?.active})`);
            console.log(`  Active in Restaurant: ${ur.active}`);
            console.log(`  Role Name: ${ur.role?.name}`);
            console.log(`  Role Permissions: ${JSON.stringify(ur.role?.permissions)}`);
            console.log(`  Role isSystem: ${ur.role?.isSystem}`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

inspectUser();
