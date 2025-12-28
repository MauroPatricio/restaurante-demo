// Script para criar um restaurante e vincular ao admin
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import User from './src/models/User.js';
import Role from './src/models/Role.js';
import UserRestaurantRole from './src/models/UserRestaurantRole.js';
import Subscription from './src/models/Subscription.js';

dotenv.config();

async function createRestaurant() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find admin user
        const admin = await User.findOne({ email: 'admin@restaurant.com' });
        if (!admin) {
            console.log('❌ Admin user not found! Run create-admin.js first.');
            process.exit(1);
        }

        console.log(`✅ Found admin user: ${admin.email}\n`);

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

        // Create restaurant
        const restaurant = await Restaurant.create({
            name: 'Restaurante Demo',
            owner: admin._id, // Add admin as owner
            address: {
                street: 'Av. Julius Nyerere, 1234',
                city: 'Maputo',
                district: 'KaMaxakeni',
                country: 'Moçambique'
            },
            phone: '+258841234567',
            email: 'contato@restaurante-demo.com',
            cuisine: ['Moçambicana', 'Internacional'],
            description: 'Restaurante demo para testes',
            logo: 'https://via.placeholder.com/200'
        });

        console.log(`✅ Created restaurant: ${restaurant.name} (ID: ${restaurant._id})\n`);

        // Create subscription for restaurant
        const now = new Date();
        const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        const subscription = await Subscription.create({
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

        // Link admin user to restaurant
        await UserRestaurantRole.create({
            user: admin._id,
            restaurant: restaurant._id,
            role: ownerRole._id,
            active: true,
            isDefault: true
        });

        console.log('✅ Linked admin to restaurant as Owner\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 SETUP COMPLETE!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`Restaurant: ${restaurant.name}`);
        console.log(`Restaurant ID: ${restaurant._id}`);
        console.log(`Subscription: Premium (Active until ${subscription.endDate.toLocaleDateString()})\n`);
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

createRestaurant();
