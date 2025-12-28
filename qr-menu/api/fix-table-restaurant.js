// Script para corrigir vinculação da Mesa 1 ao restaurante correto
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from './src/models/Table.js';
import Restaurant from './src/models/Restaurant.js';

dotenv.config();

async function fixTableRestaurant() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the restaurant "Restaurante Demo E2E"
        const restaurant = await Restaurant.findOne({ name: /Demo E2E/i });

        if (!restaurant) {
            console.log('❌ Restaurant "Restaurante Demo E2E" not found!');
            console.log('📋 Available restaurants:');
            const allRestaurants = await Restaurant.find({});
            allRestaurants.forEach(r => console.log(`   - ${r.name} (ID: ${r._id})`));
            process.exit(1);
        }

        console.log(`✅ Found restaurant: ${restaurant.name} (ID: ${restaurant._id})`);

        // Find Mesa 1
        const table = await Table.findOne({ number: 1 });

        if (!table) {
            console.log('❌ Mesa 1 not found!');
            process.exit(1);
        }

        console.log(`📍 Mesa 1 found (ID: ${table._id})`);
        console.log(`   Current restaurant: ${table.restaurant}`);

        // Update table to correct restaurant
        table.restaurant = restaurant._id;
        await table.save();

        console.log(`✅ Mesa 1 now belongs to: ${restaurant.name}`);
        console.log(`\n🔗 Correct URL:`);
        console.log(`http://192.168.88.33:5175/menu/${restaurant._id}?table=${table._id}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixTableRestaurant();
