// Script simplificado para setup completo (admin + restaurante + subscription)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import User from './src/models/User.js';
import Role from './src/models/Role.js';
import UserRestaurantRole from './src/models/UserRestaurantRole.js';
import Subscription from './src/models/Subscription.js';

dotenv.config();

async function completeSetup() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find admin user
        const admin = await User.findOne({ email: 'admin@restaurant.com' });
        if (!admin) {
            console.log('❌ Admin user not found! Run create-admin.js first.');
            process.exit(1);
        }

        console.log(`✅ Admin user found: ${admin.email}\n`);

        // Find or get restaurant
        let restaurant = await Restaurant.findOne({ owner: admin._id });

        if (!restaurant) {
            console.log('⏭️  No restaurant found, please check if one exists with different owner\n');

            // Check any restaurant
            restaurant = await Restaurant.findOne({});
            if (restaurant) {
                console.log(`✅ Found existing restaurant: ${restaurant.name}`);
                console.log(`   (Owner might be different. Updating to current admin...)\n`);

                // Update owner
                restaurant.owner = admin._id;
                await restaurant.save();
            }
        } else {
            console.log(`✅ Restaurant found: ${restaurant.name}\n`);
        }

        if (!restaurant) {
            console.log('❌ No restaurant exists. Create one manually first.');
            process.exit(1);
        }

        // Find subscription or create
        let subscription = await Subscription.findOne({ restaurant: restaurant._id });

        if (!subscription) {
            const now = new Date();
            const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

            subscription = await Subscription.create({
                restaurant: restaurant._id,
                plan: 'premium',
                status: 'active',
                currentPeriodStart: now,
                currentPeriodEnd: oneYearLater,
                features: {
                    maxTables: 100,
                    maxMenuItems: 1000,
                    maxStaff: 50,
                    analyticsEnabled: true,
                    multiLocationEnabled: true,
                    customBrandingEnabled: true
                }
            });
            console.log('✅ Created Premium subscription\n');
        } else {
            console.log('✅ Subscription already exists\n');
        }

        // Update restaurant subscription reference
        if (!restaurant.subscription) {
            restaurant.subscription = subscription._id;
            await restaurant.save();
            console.log('✅ Linked subscription to restaurant\n');
        }

        // Find or create Owner role
        let ownerRole = await Role.findOne({ name: 'Owner', isSystem: true });
        if (!ownerRole) {
            ownerRole = await Role.create({
                name: 'Owner',
                description: 'Restaurant Owner',
                permissions: ['*'],
                isSystem: true
            });
            console.log('✅ Created Owner role');
        }

        // Link admin user to restaurant
        const existingLink = await UserRestaurantRole.findOne({
            user: admin._id,
            restaurant: restaurant._id
        });

        if (!existingLink) {
            await UserRestaurantRole.create({
                user: admin._id,
                restaurant: restaurant._id,
                role: ownerRole._id,
                active: true,
                isDefault: true
            });
            console.log('✅ Linked admin to restaurant as Owner\n');
        } else {
            console.log('✅ Admin already linked to restaurant\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 SETUP COMPLETE!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`Restaurant: ${restaurant.name}`);
        console.log(`Restaurant ID: ${restaurant._id}`);
        console.log(`Subscription: Premium (Active until ${subscription.currentPeriodEnd.toLocaleDateString()})\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 LOGIN CREDENTIALS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('Email: admin@restaurant.com');
        console.log('Password: Admin@123\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Admin Dashboard: http://192.168.88.33:5173');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

completeSetup();
