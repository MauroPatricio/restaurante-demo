import mongoose from 'mongoose';
import SystemSetting from '../models/SystemSetting.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function listSettings() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const settings = await SystemSetting.find({});
        console.log('--- System Settings ---');
        settings.forEach(s => {
            console.log(`${s.key}: ${s.value} (${s.description})`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listSettings();
