import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Restaurant from './models/Restaurant.js';

dotenv.config();

async function getId() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const r = await Restaurant.findOne({});
        console.log('RESTAURANT_ID=' + r._id);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
getId();
