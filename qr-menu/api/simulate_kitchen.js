import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_URL = 'http://localhost:4001/api';

async function runSimulation() {
    try {
        // 1. Login as Owner to get Token
        console.log('🔐 Logging in as Owner...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }) // Using default seed creds or from fetch_data
        });

        const loginData = await loginRes.json();
        if (!loginData.token) throw new Error('Login failed');
        const token = loginData.token;
        const restaurants = loginData.user.restaurants;

        if (!restaurants || restaurants.length === 0) throw new Error('No restaurants found for this user');
        const restaurantId = restaurants[0]._id;
        console.log(`✅ Logged in. Managing Restaurant: ${restaurantId}`);

        // 2. Get Recent Orders
        console.log('🔍 Fetching recent orders...');
        const ordersRes = await fetch(`${API_URL}/orders/restaurant/${restaurantId}?limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ordersData = await ordersRes.json();
        const latestOrder = ordersData.orders?.[0];

        if (!latestOrder) {
            console.log('⚠️  No orders found! Please place an order in the Client Menu first.');
            console.log(`👉 Go to: http://localhost:5175/menu/${restaurantId}`);
            return;
        }

        console.log(`📦 Found Order #${latestOrder._id.slice(-6)} currently: ${latestOrder.status}`);

        // 3. Simulate Kitchen Flow
        const statuses = ['preparing', 'ready', 'completed'];

        for (const status of statuses) {
            console.log(`⏳ Updating status to: ${status.toUpperCase()} in 3 seconds...`);
            await new Promise(r => setTimeout(r, 3000));

            const updateRes = await fetch(`${API_URL}/orders/${latestOrder._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (updateRes.ok) console.log(`✅ Status updated to: ${status}`);
            else console.log(`❌ Failed to update status to ${status}`);
        }

        console.log('\n✨ Simulation Complete! The client UI should have updated automatically.');

    } catch (error) {
        console.error('❌ Simulation Error:', error.message);
    }
}

runSimulation();
