import mongoose from 'mongoose';
import Restaurant from './src/models/Restaurant.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const r = await Restaurant.findOne();
        if (r) console.log("RESTAURANT_ID:", r._id.toString());
        else console.log("NO_RESTAURANTS");
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
