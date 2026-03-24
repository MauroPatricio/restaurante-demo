import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    phone: String,
    name: String
});
const User = mongoose.model('User', UserSchema);

async function fixAdminV2() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@nhiquela.com';
        const user = await User.findOne({ email });

        if (user) {
            user.phone = '+258840000000'; // Placeholder to satisfy validation
            if (!user.name) user.name = 'System Administrator';
            await user.save();
            console.log(`Updated user ${email} with required phone and name`);
        } else {
            console.log('User not found');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixAdminV2();
