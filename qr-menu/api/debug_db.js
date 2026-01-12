import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const restaurantId = '695fe59bd9193b05e3c59209';
const tableId = '696510f39f3e8d05eb44f814';

// Minimal Schemas
const restaurantSchema = new mongoose.Schema({
    name: String,
    active: Boolean,
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' }
}, { strict: false });

const subscriptionSchema = new mongoose.Schema({
    status: String,
    endDate: Date
}, { strict: false });

const tableSchema = new mongoose.Schema({
    number: Number,
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    status: String
}, { strict: false });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);
const Table = mongoose.model('Table', tableSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        console.log(`\n--- Checking Restaurant: ${restaurantId} ---`);
        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');
        if (!restaurant) {
            console.log('❌ Restaurant NOT FOUND');
        } else {
            console.log('✅ Found:', restaurant.name);
            console.log('Active:', restaurant.active);
            console.log('Subscription:', restaurant.subscription);

            if (!restaurant.active) console.warn('⚠️ Restaurant is INACTIVE');
            if (!restaurant.subscription) console.warn('⚠️ No Subscription linked');
            else {
                console.log('Ref Subscription Status:', restaurant.subscription.status);
                // Also check if the subscription object itself has checks
                if (restaurant.subscription.endDate) {
                    console.log('Ends:', restaurant.subscription.endDate);
                    if (new Date(restaurant.subscription.endDate) < new Date()) console.warn('⚠️ Subscription EXPIRED');
                }
            }
        }

        console.log(`\n--- Checking Table: ${tableId} ---`);
        const table = await Table.findById(tableId);
        if (!table) {
            console.log('❌ Table NOT FOUND');
        } else {
            console.log('✅ Found Table #', table.number);
            console.log('Status:', table.status);
            console.log('Linked Restaurant:', table.restaurant);

            if (table.restaurant.toString() !== restaurantId) {
                console.warn('⚠️ Table linked to DIFFERENT restaurant:', table.restaurant);
            }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
