import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api';

async function checkOrder() {
    try {
        // Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test.owner.1766048865565@example.com', password: 'Password123!' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        const rId = loginData.user.restaurants[0]._id;

        // Get orders
        const ordersRes = await fetch(`${API_URL}/orders/restaurant/${rId}?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ordersData = await ordersRes.json();

        const browserOrder = ordersData.orders.find(o => o.customerName === 'Browser Tester');

        if (browserOrder) {
            console.log('✅ Found Browser Order:', browserOrder._id);
        } else {
            console.log('❌ No order found from "Browser Tester"');
            console.log('Recent orders:', ordersData.orders.map(o => o.customerName));
        }

    } catch (e) {
        console.error(e);
    }
}

checkOrder();
