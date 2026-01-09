// Simple test to check if Kitchen Dashboard data is available
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const RESTAURANT_ID = '695fe59bd9193b05e3c59209'; // KFC

async function testKitchenData() {
    console.log('Testing Kitchen Dashboard Data Availability...\n');

    try {
        // Test 1: Check if health endpoint works
        console.log('1. Testing Health Endpoint...');
        const healthRes = await fetch('http://localhost:5000/health');
        const healthText = await healthRes.text();
        console.log(`   ✅ Health: ${healthText}\n`);

        // Test 2: Get orders (public endpoint for kitchen display)
        console.log('2. Testing Orders Endpoint (for Kitchen)...');
        const ordersRes = await fetch(`${API_URL}/orders/restaurant/${RESTAURANT_ID}?status=pending,confirmed,preparing,ready`);

        if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            const orders = ordersData.orders || [];
            console.log(`   ✅ Orders fetched: ${orders.length} orders`);

            if (orders.length > 0) {
                const pending = orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length;
                const preparing = orders.filter(o => o.status === 'preparing').length;
                const ready = orders.filter(o => o.status === 'ready').length;

                console.log(`      - Pending/Confirmed: ${pending}`);
                console.log(`      - Preparing: ${preparing}`);
                console.log(`      - Ready: ${ready}`);
            }
        } else {
            console.log(`   ❌ Failed to fetch orders: ${ordersRes.status} - ${ordersRes.statusText}`);
        }

        console.log('\n3. Summary:');
        console.log('   The backend is responding and can provide order data.');
        console.log('   Kitchen Dashboard should be able to fetch and display this data.');
        console.log('\n   To verify real-time updates:');
        console.log('   1. Open http://localhost:5173/dashboard/kitchen in your browser');
        console.log('   2. Create a new order from the client menu');
        console.log('   3. The numbers should update automatically without refresh');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testKitchenData();
