// Script para criar usuário Admin com o novo sistema de roles
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Role from './src/models/Role.js';
import UserRestaurantRole from './src/models/UserRestaurantRole.js';
import Restaurant from './src/models/Restaurant.js';

dotenv.config();

async function createCompleteAdminUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const adminData = {
            name: 'Admin Demo',
            email: 'admin@restaurant.com',
            password: 'Admin@123',
            phone: '+258843333333'
        };

        // 1. Check if user already exists
        let user = await User.findOne({ email: adminData.email });

        if (user) {
            console.log('✅ User already exists:', user.email);
        } else {
            // Create user (password will be hashed by pre-save hook)
            user = await User.create({
                name: adminData.name,
                email: adminData.email,
                password: adminData.password,
                phone: adminData.phone,
                active: true
            });
            console.log('✅ Created user:', user.email);
        }

        // 2. Find or create Admin role
        let adminRole = await Role.findOne({ name: 'Admin', isSystem: true });

        if (!adminRole) {
            adminRole = await Role.create({
                name: 'Admin',
                description: 'System Administrator',
                permissions: ['*'], // All permissions
                isSystem: true,
                restaurant: null // Global role
            });
            console.log('✅ Created Admin role');
        } else {
            console.log('✅ Admin role found');
        }

        // 3. Find a restaurant (or skip if none exists)
        const restaurant = await Restaurant.findOne({});

        if (restaurant) {
            console.log(`✅ Found restaurant: ${restaurant.name}\n`);

            // 4. Create UserRestaurant Role link
            const existingLink = await UserRestaurantRole.findOne({
                user: user._id,
                restaurant: restaurant._id
            });

            if (!existingLink) {
                await UserRestaurantRole.create({
                    user: user._id,
                    restaurant: restaurant._id,
                    role: adminRole._id,
                    active: true,
                    isDefault: true
                });
                console.log('✅ Created UserRestaurantRole link\n');
            } else {
                console.log('✅ UserRestaurantRole link already exists\n');
            }
        } else {
            console.log('⚠️  No restaurant found. User can login and create a restaurant.\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 ADMIN CREDENTIALS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`Name: ${adminData.name}`);
        console.log(`Email: ${adminData.email}`);
        console.log(`Password: ${adminData.password}`);
        console.log(`User ID: ${user._id}`);
        console.log(`Role: Admin (ID: ${adminRole._id})\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Admin Dashboard: http://192.168.88.33:5173');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createCompleteAdminUser();
