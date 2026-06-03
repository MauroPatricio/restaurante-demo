import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: 'd:/Projectos/restaurante-demo/qr-menu/api/.env' });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String }, { strict: false }));
        const users = await User.find({ name: /mauro/i });
        const user = users[0];
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        console.log('Fetching global-status with token...');
        const res = await fetch('http://127.0.0.1:5000/api/subscriptions/global-status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
