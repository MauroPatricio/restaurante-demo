import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from '../src/models/Table.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const generateUniqueCode = async () => {
    let code;
    let exists = true;
    while (exists) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await Table.findOne({ numericCode: code });
        if (!existing) exists = false;
    }
    return code;
};

const migrate = async () => {
    try {
        console.log('Connecting to DB...');
        console.log('URI:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);

        console.log('Connected. Fetching tables...');
        const tables = await Table.find({ numericCode: { $exists: false } });
        console.log(`Found ${tables.length} tables without numeric codes.`);

        let updated = 0;
        for (const table of tables) {
            const code = await generateUniqueCode();
            table.numericCode = code;
            await table.save();
            console.log(`Updated Table ${table.number} (${table._id}) with code: ${code}`);
            updated++;
        }

        console.log(`Migration complete. Updated ${updated} tables.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
