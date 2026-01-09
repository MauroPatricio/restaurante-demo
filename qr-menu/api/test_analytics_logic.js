import mongoose from 'mongoose';
import Order from './src/models/Order.js';
import Table from './src/models/Table.js';
import TableSession from './src/models/TableSession.js';
import MenuItem from './src/models/MenuItem.js';
import WaiterCall from './src/models/WaiterCall.js';
import { startOfDay } from 'date-fns';

const mongoURI = 'mongodb://localhost:27017/qr-menu';
const restaurantId = new mongoose.Types.ObjectId('67669d05bccce6e06cb32190');

async function testLogic() {
    await mongoose.connect(mongoURI);
    console.log('Connected to DB');

    try {
        console.log('\n--- Testing Customer Logic ---');
        const basicStats = await Order.aggregate([
            { $match: { restaurant: restaurantId, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: "$phone",
                    name: { $first: "$customerName" },
                    totalSpent: { $sum: "$total" },
                    orderCount: { $count: {} },
                    lastVisit: { $max: "$createdAt" },
                    firstVisit: { $min: "$createdAt" }
                }
            }
        ]);
        console.log(`Found ${basicStats.length} unique customers`);
        if (basicStats.length > 0) console.log('Top Customer:', basicStats[0]);

        console.log('\n--- Testing Hall Logic ---');
        const tables = await Table.find({ restaurant: restaurantId }).lean();
        console.log(`Found ${tables.length} tables`);

        const tablePerformance = await TableSession.aggregate([
            { $match: { restaurant: restaurantId, status: 'closed' } },
            {
                $project: {
                    table: 1,
                    duration: { $divide: [{ $subtract: ["$endedAt", "$startedAt"] }, 1000 * 60] }
                }
            },
            {
                $group: {
                    _id: "$table",
                    avgDuration: { $avg: "$duration" }
                }
            }
        ]);
        console.log('Table Performance Stats:', tablePerformance);

    } catch (e) {
        console.error('Logic test failed:', e);
    } finally {
        await mongoose.disconnect();
    }
}

testLogic();
