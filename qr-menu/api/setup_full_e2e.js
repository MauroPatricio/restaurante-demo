import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api';

async function setup() {
    try {
        const unique = Date.now();
        const email = `test.e2e.${unique}@example.com`;
        const password = 'Password123!';

        console.log(`\n🚀 Starting E2E Setup (${unique})...`);

        // 1. REGISTER
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'E2E Complete User',
                email,
                password,
                phone: `84${unique.toString().slice(-7)}`,
                restaurantName: `E2E Complete Resto ${unique}`,
                restaurantAddress: '123 E2E St'
            })
        });
        const regData = await regRes.json();

        if (!regData.token) {
            throw new Error(`Registration Failed: ${JSON.stringify(regData)}`);
        }

        const token = regData.token;
        const restaurantId = regData.restaurant.id;
        console.log(`✅ User Registered: ${email}`);
        console.log(`✅ Restaurant Created: ${restaurantId}`);

        // 2. SWITCH CONTEXT
        const ctxRes = await fetch(`${API_URL}/auth/select-restaurant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ restaurantId })
        });
        const ctxData = await ctxRes.json();
        const scopedToken = ctxData.token;
        console.log(`✅ Context Switched`);

        // 3. CREATE MENU ITEM
        const itemRes = await fetch(`${API_URL}/menu-items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${scopedToken}`
            },
            body: JSON.stringify({
                name: 'E2E Special Burger',
                price: 750,
                description: 'Created by automated setup',
                category: 'E2E Specials',
                available: true,
                eta: 12
            })
        });
        const itemData = await itemRes.json();
        console.log(`✅ Menu Item Created: ${itemData.menuItem.name}`);

        // 4. CREATE TABLE
        const tableRes = await fetch(`${API_URL}/tables`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${scopedToken}`
            },
            body: JSON.stringify({
                restaurant: restaurantId,
                number: 101, // Specific ID
                capacity: 4,
                type: 'standard'
            })
        });
        const tableData = await tableRes.json();
        const tableId = tableData.table._id;
        console.log(`✅ Table Created: #${tableData.table.number} (${tableId})`);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 E2E CREDENTIALS & DATA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Login Email:    ${email}`);
        console.log(`Login Password: ${password}`);
        console.log(`Restaurant ID:  ${restaurantId}`);
        console.log(`Table ID:       ${tableId}`);
        console.log(`Client URL:     http://localhost:5174/menu/${restaurantId}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (e) {
        console.error('❌ Setup Error:', e);
    }
}

setup();
