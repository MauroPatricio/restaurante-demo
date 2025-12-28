// Script para criar usuários demo: Owner, Manager e Admin
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Restaurant from './src/models/Restaurant.js';

dotenv.config();

async function createDemoUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find any restaurant
        const restaurant = await Restaurant.findOne({});

        if (!restaurant) {
            console.log('❌ No restaurant found! Please create a restaurant first.');
            process.exit(1);
        }

        console.log(`✅ Restaurant: ${restaurant.name} (ID: ${restaurant._id})\n`);

        // Users to create
        const users = [
            {
                name: 'Owner Demo',
                email: 'owner@restaurant.com',
                password: 'Owner@123',
                role: 'Owner',
                phone: '+258841111111'
            },
            {
                name: 'Manager Demo',
                email: 'manager@restaurant.com',
                password: 'Manager@123',
                role: 'Manager',
                phone: '+258842222222'
            },
            {
                name: 'Admin Demo',
                email: 'admin@restaurant.com',
                password: 'Admin@123',
                role: 'Admin',
                phone: '+258843333333'
            }
        ];

        console.log('📝 Creating users...\n');

        for (const userData of users) {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                console.log(`⚠️  ${userData.role} already exists: ${userData.email}`);
                continue;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Create user
            const user = await User.create({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                role: userData.role,
                phone: userData.phone,
                restaurant: restaurant._id,
                restaurants: [restaurant._id],
                active: true
            });

            console.log(`✅ Created ${userData.role}:`);
            console.log(`   Email: ${userData.email}`);
            console.log(`   Password: ${userData.password}`);
            console.log(`   ID: ${user._id}\n`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 LOGIN CREDENTIALS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        users.forEach(u => {
            console.log(`${u.role.toUpperCase()}:`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Password: ${u.password}\n`);
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Admin Dashboard: http://192.168.88.33:5173');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createDemoUsers();
