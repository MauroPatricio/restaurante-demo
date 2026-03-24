import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from './models/Account.js';
import Restaurant from './models/Restaurant.js';

dotenv.config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const r = await Restaurant.findOne({});
        if (!r) {
            console.log('No restaurant found');
            process.exit(0);
        }
        console.log('Restaurant ID:', r._id);
        const accounts = await Account.find({ restaurant: r._id }).sort({ code: 1 });
        accounts.forEach(a => {
            console.log(`${a.code} - ${a.name}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
inspect();
