import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from './src/models/Table.js';
import User from './src/models/User.js';

dotenv.config();

const assignJoseCossa = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find Jose Cossa waiter
        let waiter = await User.findOne({ name: 'Jose Cossa' });

        if (!waiter) {
            console.log('❌ Jose Cossa not found! Looking for any waiter...');
            waiter = await User.findOne({ role: 'waiter' });

            if (!waiter) {
                console.log('❌ No waiters found! Please create Jose Cossa user first.');
                process.exit(1);
            }

            console.log(`ℹ️  Using: ${waiter.name || 'Unknown'}`);
        } else {
            console.log(`✅ Found Jose Cossa: ${waiter.email}`);
        }

        // Find Mesa 1
        const table = await Table.findOne({ number: 1 });

        if (!table) {
            console.log('❌ Mesa 1 not found!');
            process.exit(1);
        }

        // Assign waiter
        table.assignedWaiterId = waiter._id;
        table.assignedWaiter = waiter.name || 'Jose Cossa';
        await table.save();

        console.log(`✅ Assigned ${waiter.name || 'Jose Cossa'} to Mesa ${table.number}`);
        console.log(`   Waiter ID: ${waiter._id}`);
        console.log(`   Waiter Name: ${waiter.name}`);
        console.log(`   Table ID: ${table._id}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

assignJoseCossa();
