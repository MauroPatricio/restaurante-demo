import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Account from './src/models/Account.js';
import Restaurant from './src/models/Restaurant.js';

dotenv.config();

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const restaurantId = '69524776e905ab64485c048c';
        console.log(`Checking restaurant: ${restaurantId}`);

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            console.error('Restaurant not found');
            process.exit(1);
        }
        console.log('Restaurant name:', restaurant.name);

        const accounts = await Account.find({ restaurant: restaurantId });
        console.log(`Found ${accounts.length} accounts`);

        const totalRevenue = await Account.findOne({ restaurant: restaurantId, code: '7.1' });
        console.log('Revenue account:', totalRevenue ? totalRevenue.name : 'Not Found', 'Balance:', totalRevenue ? totalRevenue.balance : 'N/A');

        const totalExpenses = await Account.find({
            restaurant: restaurantId,
            type: 'expense'
        });
        console.log('Expenses count:', totalExpenses.length);

        const totalTax = await Account.findOne({ restaurant: restaurantId, code: '4.4' });
        console.log('Tax account:', totalTax ? totalTax.name : 'Not Found', 'Balance:', totalTax ? totalTax.balance : 'N/A');

        console.log('Diagnostics complete');
        process.exit(0);
    } catch (error) {
        console.error('Diagnostics failed:', error);
        process.exit(1);
    }
}

diagnose();
