import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from './src/models/Table.js';
import User from './src/models/User.js';

dotenv.config();

const assignWaiterToTable = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find any user to assign as waiter (or create one)
        let waiter = await User.findOne({ role: 'waiter' });

        if (!waiter) {
            // Find admin user and use as waiter for demo
            waiter = await User.findOne();
            console.log(`ℹ️  No waiter found, using admin: ${waiter?.email}`);
        }

        if (!waiter) {
            console.log('❌ No users found! Please create a user first.');
            process.exit(1);
        }

        // Find Mesa 1
        const table = await Table.findOne({ number: 1 });

        if (!table) {
            console.log('❌ Mesa 1 not found!');
            process.exit(1);
        }

        // Assign waiter
        table.assignedWaiterId = waiter._id;
        table.assignedWaiter = waiter.name || 'Waiter Demo';
        await table.save();

        console.log(`✅ Assigned ${waiter.name || 'Waiter'} to Mesa ${table.number}`);
        console.log(`   Waiter ID: ${waiter._id}`);
        console.log(`   Waiter Name: ${waiter.name || 'N/A'}`);
        console.log(`   Table ID: ${table._id}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

assignWaiterToTable();
