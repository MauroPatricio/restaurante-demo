import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

// Import Models directly (assuming file structure)
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';
import Restaurant from '../src/models/Restaurant.js';
import UserRestaurantRole from '../src/models/UserRestaurantRole.js';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurante-demo';

const createAdmin = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Ensure Admin User First (needed for Restaurant owner)
        const adminEmail = 'admin@system.com';
        const adminPassword = 'password123!';
        let user = await User.findOne({ email: adminEmail });

        if (!user) {
            console.log('🏗️ Creating Admin User...');
            user = await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: adminPassword, // Will be hashed by pre-save hook
                phone: '000000000',
                address: 'System HQ',
                active: true
            });
            console.log('✅ Admin User Created:', user._id);
        } else {
            console.log('ℹ️ Admin User exists. Updating password...');
            user.password = adminPassword;
            await user.save();
            console.log('✅ Admin Password Updated.');
        }

        // 2. Ensure System Restaurant
        let systemRestaurant = await Restaurant.findOne({ name: 'System Administration' });
        if (!systemRestaurant) {
            console.log('🏗️ Creating System Administration Restaurant...');
            systemRestaurant = await Restaurant.create({
                name: 'System Administration',
                email: 'admin@system.com',
                phone: '000000000',
                address: 'System',
                active: true,
                owner: user._id // Set the owner
            });
            console.log('✅ System Restaurant Created:', systemRestaurant._id);
        } else {
            console.log('ℹ️ System Restaurant exists:', systemRestaurant._id);
        }

        // 3. Ensure Admin Role
        let adminRole = await Role.findOne({ name: 'Admin', isSystem: true });
        if (!adminRole) {
            console.log('🏗️ Creating Admin Role...');
            adminRole = await Role.create({
                name: 'Admin',
                description: 'System Administrator with full access',
                isSystem: true,
                permissions: ['all'],
                restaurant: systemRestaurant._id // Attach to system restaurant
            });
            console.log('✅ Admin Role Created:', adminRole._id);
        } else {
            console.log('ℹ️ Admin Role exists:', adminRole._id);
            // Force update permissions to ensure full access
            if (!adminRole.permissions.includes('all')) {
                console.log('⚠️ Updating Admin Role permissions to [all]...');
                adminRole.permissions = ['all'];
                await adminRole.save();
                console.log('✅ Admin Role permissions updated.');
            }
        }

        // 4. Assign Role
        const existingAssignment = await UserRestaurantRole.findOne({
            user: user._id,
            restaurant: systemRestaurant._id,
        });

        // Note: Check roughly by user and restaurant. If role differs, we might update it, but here we just check existence.

        if (!existingAssignment) {
            console.log('🔗 Assigning Admin Role to User...');
            await UserRestaurantRole.create({
                user: user._id,
                restaurant: systemRestaurant._id,
                role: adminRole._id,
                active: true,
                isDefault: true
            });
            console.log('✅ Role Assigned.');
        } else {
            // If assignment exists but role is different (unlikely for this script logic but good safety),
            // update it to ensure they are the Admin.
            if (existingAssignment.role.toString() !== adminRole._id.toString()) {
                console.log('⚠️ Updating existing assignment to Admin Role...');
                existingAssignment.role = adminRole._id;
                await existingAssignment.save();
                console.log('✅ Role Updated.');
            } else {
                console.log('ℹ️ Role assignment already correct.');
            }
        }

        console.log('\n🎉 Admin User Setup Complete!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
        process.exit();
    }
};

createAdmin();
