import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';
import Restaurant from '../src/models/Restaurant.js';
import UserRestaurantRole from '../src/models/UserRestaurantRole.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurante-demo';

const verifyAdmin = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        const email = 'nhiquelaservicos@gmail.com';
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            console.error(`❌ User ${email} NOT FOUND in database.`);
        } else {
            console.log(`✅ User ${email} FOUND.`);
            console.log(`🆔 ID: ${user._id}`);

            // Check password 'admin123!'
            const isMatchAdmin = await user.comparePassword('admin123!');
            console.log(`🔐 Password 'admin123!' match: ${isMatchAdmin}`);

            // Check password 'password123!'
            const isMatchPass = await user.comparePassword('password123!');
            console.log(`🔐 Password 'password123!' match: ${isMatchPass}`);
        }

        const restaurant = await Restaurant.findOne({ name: 'System Administration' });
        if (restaurant) {
            console.log(`✅ System Restaurant FOUND: ${restaurant._id}`);

            // Check Role assignment
            if (user) {
                const assignment = await UserRestaurantRole.findOne({
                    user: user._id,
                    restaurant: restaurant._id
                }).populate('role');

                if (assignment) {
                    console.log(`✅ Role Assignment FOUND.`);
                    console.log(`   Role: ${assignment.role?.name}`);
                    console.log(`   Is System: ${assignment.role?.isSystem}`);
                    console.log(`   Permissions: ${assignment.role?.permissions}`);
                } else {
                    console.error('❌ UserRestaurantRole assignment NOT FOUND.');
                }
            }

        } else {
            console.error('❌ System Administration Restaurant NOT FOUND.');
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

verifyAdmin();
