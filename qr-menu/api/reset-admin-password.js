// Script para verificar e atualizar a senha do admin
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function resetAdminPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find admin user (need to select password field explicitly)
        const admin = await User.findOne({ email: 'admin@restaurant.com' }).select('+password');

        if (!admin) {
            console.log('❌ Admin user not found!');
            process.exit(1);
        }

        console.log(`✅ Found admin: ${admin.email}\n`);
        console.log('Current password hash:', admin.password?.substring(0, 20) + '...\n');

        // Hash new password directly
        const newPassword = 'Admin@123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log('New password hash:', hashedPassword.substring(0, 20) + '...\n');

        // Update password directly (bypass the pre-save hook)
        await User.updateOne(
            { _id: admin._id },
            { $set: { password: hashedPassword } }
        );

        console.log('✅ Password updated successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 LOGIN CREDENTIALS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('Email: admin@restaurant.com');
        console.log('Password: Admin@123\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Admin Dashboard: http://localhost:5173');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetAdminPassword();
