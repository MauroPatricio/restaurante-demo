import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db(); // Uses the DB from the connection string
        const users = db.collection('users');
        
        const result = await users.updateOne(
            { email: 'admin@nhiquela.com' },
            { $set: { phone: '+258840000000', name: 'System Administrator', active: true } }
        );
        
        console.log('Matched:', result.matchedCount);
        console.log('Modified:', result.modifiedCount);
        
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
