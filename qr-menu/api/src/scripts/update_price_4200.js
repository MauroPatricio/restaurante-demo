import mongoose from 'mongoose';
import SystemSetting from '../models/SystemSetting.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function updatePrice() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const setting = await SystemSetting.findOneAndUpdate(
            { key: 'base_subscription_price' },
            { 
                value: '4200',
                description: 'Novo preço base da subscrição (Standard)' 
            },
            { upsert: true, new: true }
        );

        console.log('✅ Base price updated successfully:');
        console.log(setting);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating price:', error);
        process.exit(1);
    }
}

updatePrice();
