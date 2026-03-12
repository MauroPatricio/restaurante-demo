import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MenuItemSchema = new mongoose.Schema({
    name: String,
    price: Number,
    costPrice: Number,
    stock: Number,
    stockMin: Number,
    unit: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    restaurant: mongoose.Schema.Types.ObjectId
});

const CategorySchema = new mongoose.Schema({
    name: String
});

const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

async function run() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const items = await MenuItem.find({
            name: { $in: ['Cerveja TXOTI', 'Sushi'] }
        }).populate('category');

        console.log('DATA_START');
        console.log(JSON.stringify(items.map(i => ({
            name: i.name,
            price: i.price,
            costPrice: i.costPrice,
            stock: i.stock,
            stockMin: i.stockMin,
            unit: i.unit,
            category: i.category?.name,
            restaurant: i.restaurant
        })), null, 2));
        console.log('DATA_END');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
