import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qr-menu';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const UserSchema = new mongoose.Schema({
            name: String,
            email: String,
            phone: String,
            active: Boolean
        });
        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const users = await User.find({});
        console.log('USERS_LIST:', JSON.stringify(users.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            active: u.active
        })), null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
