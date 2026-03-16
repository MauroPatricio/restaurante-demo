import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Projectos/restaurante-demo/qr-menu/api/.env' });

async function checkKFC() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}), 'restaurants');
        const kfc = await Restaurant.findOne({ name: /KFC/i });
        console.log('KFC Data:', JSON.stringify(kfc, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}
checkKFC();
