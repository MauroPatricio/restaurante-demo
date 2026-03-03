import mongoose from 'mongoose';
import Role from './src/models/Role.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const roleId = '6942acd582793e2580a0f2c2';
    const role = await Role.findById(roleId);
    console.log('Role:', JSON.stringify(role, null, 2));
    process.exit(0);
}

check();
