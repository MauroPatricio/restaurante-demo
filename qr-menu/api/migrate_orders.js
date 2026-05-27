import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const orderSchema = new mongoose.Schema({
    orderNumber: String
}, { strict: false });

const Order = mongoose.model('Order', orderSchema, 'orders');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const orders = await Order.find({ orderNumber: { $exists: false } });
        console.log(`Found ${orders.length} orders without orderNumber`);

        for (const order of orders) {
            const orderNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            order.orderNumber = orderNumber;
            await order.save();
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
