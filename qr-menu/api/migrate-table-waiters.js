import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from './src/models/Table.js';
import User from './src/models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MongoDB URI not defined in .env (checked MONGODB_URI and MONGO_URI)');
        }
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const migrateWaiters = async () => {
    await connectDB();

    try {
        console.log('Starting migration...');

        // Find tables with assignedWaiter (string) but no assignedWaiterId
        const tables = await Table.find({
            assignedWaiter: { $exists: true, $ne: '' },
            $or: [{ assignedWaiterId: { $exists: false } }, { assignedWaiterId: null }]
        });

        console.log(`Found ${tables.length} tables to migrate.`);

        let updated = 0;
        let errors = 0;
        let notFound = 0;

        for (const table of tables) {
            const waiterName = table.assignedWaiter;

            // Try to find user by name (case insensitive)
            // Ideally we should also check restaurant, but User model doesn't explicitly have restaurant ref in top level (it's in UserRestaurantRole)
            // or maybe it does? Let's check User model. 
            // Wait, checking User.js... it doesn't have restaurant field directly usually, or maybe it does in this project?
            // In the `UserManagement` code I saw `usersAPI.getByRestaurant`. The controller does the join.
            // For simple migration, let's search by name. If names are unique enough it's fine.

            const user = await User.findOne({
                name: { $regex: new RegExp(`^${waiterName}$`, 'i') }
            });

            if (user) {
                table.assignedWaiterId = user._id;
                await table.save();
                console.log(`✅ Table ${table.number}: Migrated "${waiterName}" -> ${user.name} (${user._id})`);
                updated++;
            } else {
                console.warn(`⚠️ Table ${table.number}: User not found for "${waiterName}"`);
                notFound++;
            }
        }

        console.log('\nMigration Summary:');
        console.log(`Total Tables Processed: ${tables.length}`);
        console.log(`Updated: ${updated}`);
        console.log(`User Not Found: ${notFound}`);
        console.log(`Errors: ${errors}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

migrateWaiters();
