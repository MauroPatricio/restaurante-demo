import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String }, { strict: false }));
    const users = await User.find({ name: /mauro/i });
    const token = jwt.sign({ userId: users[0]._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await mongoose.disconnect();
    
    const res = await fetch('http://127.0.0.1:5000/api/subscriptions/global-status', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) {
       console.log('HTTP ERROR', res.status, await res.text());
       return;
    }
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
run();
