import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/Projectos/restaurante-demo/qr-menu/api/.env' });

async function fixAllCurrencies() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({
            settings: {
                currency: String
            }
        }), 'restaurants');

        const result = await Restaurant.updateMany(
            { 'settings.currency': 'MT' },
            { $set: { 'settings.currency': 'MZN' } }
        );

        console.log(`Updated ${result.modifiedCount} restaurants from MT to MZN.`);

        // Also check if any order has 'MT' (optional since convertCurrency handles it now, but good for data integrity)
        const Order = mongoose.model('Order', new mongoose.Schema({
            currency: String
        }), 'orders');

        const orderResult = await Order.updateMany(
            { currency: 'MT' },
            { $set: { currency: 'MZN' } }
        );
        console.log(`Updated ${orderResult.modifiedCount} orders from MT to MZN.`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error fixing currencies:', error);
        process.exit(1);
    }
}

fixAllCurrencies();
