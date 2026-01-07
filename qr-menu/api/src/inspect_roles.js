
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Role from './models/Role.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const inspectRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurante-demo');
        console.log('Connected to MongoDB');

        const roles = await Role.find({});
        console.log('Found Roles:');
        roles.forEach(r => {
            console.log(`- Name: ${r.name}, isSystem: ${r.isSystem}`);
            console.log(`  Permissions: ${JSON.stringify(r.permissions)}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

inspectRoles();
