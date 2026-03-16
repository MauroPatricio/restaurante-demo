import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import Table from './src/models/Table.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const run = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const restaurants = await Restaurant.find({}).limit(5);
        console.log('Restaurants:');
        for (const r of restaurants) {
            console.log(`ID: ${r._id}, Name: ${r.name}`);
            const tables = await Table.find({ restaurant: r._id }).limit(1);
            if (tables.length > 0) {
                console.log(`  Table ID: ${tables[0]._id}, Number: ${tables[0].number}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
