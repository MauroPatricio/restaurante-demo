// Script para verificar usuário Admin
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function checkAdminUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Search for admin user
        const admin = await User.findOne({ email: 'admin@restaurant.com' });

        if (!admin) {
            console.log('❌ Admin user NOT FOUND in database!');
            console.log('\n📋 Searching all users...\n');

            const allUsers = await User.find({});
            console.log(`Found ${allUsers.length} users in database:\n`);

            allUsers.forEach(user => {
                console.log(`- ${user.name} (${user.email})`);
                console.log(`  Role: ${user.role}`);
                console.log(`  ID: ${user._id}\n`);
            });

            process.exit(1);
        }

        console.log('✅ Admin user FOUND in database!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 USER DETAILS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`Name: ${admin.name}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Role: ${admin.role}`);
        console.log(`Phone: ${admin.phone}`);
        console.log(`Active: ${admin.active}`);
        console.log(`ID: ${admin._id}`);
        console.log(`Restaurants: ${admin.restaurants?.length || 0}`);
        console.log(`Created: ${admin.createdAt}\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAdminUser();
