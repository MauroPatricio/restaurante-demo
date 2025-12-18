import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const migrateUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ restaurant: { $exists: true } });
        console.log(`Found ${users.length} users to migrate`);

        for (const user of users) {
            if (user.restaurant && (!user.restaurants || user.restaurants.length === 0)) {
                user.restaurants = [user.restaurant];
                // We can't delete 'restaurant' yet if strict mode prevents it, 
                // but since we updated the schema, 'restaurant' might be ignored or accessible via _doc
                // To properly unset, we might need updateOne
                await User.updateOne(
                    { _id: user._id },
                    {
                        $set: { restaurants: [user.restaurant] },
                        $unset: { restaurant: "" }
                    }
                );
                console.log(`Migrated user: ${user.email}`);
            }
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateUsers();
