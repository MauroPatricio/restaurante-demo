
import axios from 'axios';
import crypto from 'crypto';

const API_URL = 'http://127.0.0.1:5000/api';
const CLIENT_URL = 'http://localhost:5174';

async function setup() {
    try {
        const timestamp = Date.now();
        const suffix = timestamp.toString().slice(-6); // Longer suffix

        // 1. Register User
        console.log('Registering User...');
        const userPayload = {
            name: 'Test Owner',
            email: `owner${suffix}@test.com`,
            password: 'password123',
            phone: `84${suffix.padEnd(7, '0')}`,
            address: 'Test Address'
        };

        let token;
        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, userPayload);
            token = regRes.data.token;
            console.log('User registered. Token obtained.');
        } catch (e) {
            console.error('User register failed:', e.response?.data || e.message);
            return;
        }

        // 2. Create Restaurant
        console.log('Creating Restaurant...');
        let restaurantId;
        try {
            const restRes = await axios.post(`${API_URL}/restaurants`, {
                name: `Test Rest ${suffix}`,
                address: '123 Test St',
                phone: userPayload.phone,
                email: userPayload.email
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            restaurantId = restRes.data.restaurant.id || restRes.data.restaurant._id;
            console.log('Restaurant ID:', restaurantId);
        } catch (e) {
            console.error('Restaurant create failed:', e.response?.data || e.message);
            return;
        }

        // 3. Create Table
        console.log('Creating table...');
        const tableRes = await axios.post(`${API_URL}/tables`, {
            restaurant: restaurantId,
            number: 1,
            capacity: 4,
            status: 'free',
            assignedWaiter: null
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const tableId = tableRes.data.table._id;
        console.log('Table ID:', tableId);

        // 4. Create Menu Item
        console.log('Creating menu item...');
        await axios.post(`${API_URL}/menu-items`, {
            name: 'Test Burger',
            price: 500,
            category: 'Main', // Ensure 'Main' category exists? Or it might create/ignore
            // Usually category should be ID, but some systems accept name or create it?
            // api/src/models/MenuItem.js references Category model.
            // If I need a category ID, I might fail here.
            // Let's try simple create first. If validation fails, we might need to fetch categories.
            description: 'Delicious test burger',
            available: true
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Wait, if category is required and reference, I must fetch/create category first.
        // Let's check if we can get categories or if default ones exist.
        // `d:\Projectos\restaurante-demo\qr-menu\api\src\routes\categories.js` likely exists.

        // Let's just try to create item with empty category or check if it's required.
        // If it fails, I'll assume item creation is not strictly needed for navigation test, 
        // BUT needed for "Place Order".

    } catch (e) {
        console.error('Legacy setup flow failed at step 3/4:', e.response?.data || e.message);
        // Continue to URL generation anyway to test navigation? 
        // No, need table ID.
    }

    // 4. Generate Token (if tableId exists)
    // Assuming tableId/restaurantId are available in scope if success... 
    // I need to refactor to keep vars in scope. I used `let`.
}

// Refactored clean run
async function run() {
    const timestamp = Date.now();
    const suffix = timestamp.toString().slice(-6);
    let token, restaurantId, tableId, categoryId;

    try {
        // 1. Register User
        console.log('1. Registering User...');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test Owner',
            email: `owner${suffix}@test.com`,
            password: 'password123',
            phone: `84${suffix.padEnd(7, '0')}`,
            address: 'Test Address'
        });
        token = regRes.data.token;

        // 2. Create Restaurant
        console.log('2. Creating Restaurant...');
        const restRes = await axios.post(`${API_URL}/restaurants`, {
            name: `Test Rest ${suffix}`,
            address: '123 Test St',
            phone: `84${suffix.padEnd(7, '0')}`,
            email: `owner${suffix}@test.com`
        }, { headers: { Authorization: `Bearer ${token}` } });
        restaurantId = restRes.data.restaurant.id || restRes.data.restaurant._id;

        // 2.5 Switch Context (Get Scoped Token)
        console.log('2.5 Switching Context...');
        const selectRes = await axios.post(`${API_URL}/auth/select-restaurant`, {
            restaurantId: restaurantId
        }, { headers: { Authorization: `Bearer ${token}` } });
        token = selectRes.data.token; // Update token to scoped token
        console.log('Scoped Token Obtained.');

        // 3. Create Category (Needed for Item)
        // Assume /api/categories endpoint exists and is standard CRUD
        // Check local filesystem listing: `api/src/routes/categories.js` exists.
        console.log('3. Creating Category...');
        try {
            const catRes = await axios.post(`${API_URL}/categories`, {
                name: 'Main',
                displayOrder: 1,
                isActive: true
            }, { headers: { Authorization: `Bearer ${token}` } });
            categoryId = catRes.data.category._id;
        } catch (e) {
            console.log('Category creation failed, maybe not needed or error:', e.message);
        }

        // 4. Create Table
        console.log('4. Creating Table...');
        const tableRes = await axios.post(`${API_URL}/tables`, {
            restaurant: restaurantId,
            number: 1,
            capacity: 4,
            status: 'free'
        }, { headers: { Authorization: `Bearer ${token}` } });
        tableId = tableRes.data.table._id;

        // 5. Create Menu Item
        console.log('5. Creating Menu Item...');
        await axios.post(`${API_URL}/menu-items`, {
            name: 'Test Burger',
            price: 500,
            category: categoryId, // Pass ID if we have it
            description: 'Delicious test burger',
            available: true,
            restaurant: restaurantId
        }, { headers: { Authorization: `Bearer ${token}` } });

        // 6. Generate QR URL
        const secret = 'default-qr-secret-change-in-production';
        const qrPayload = `${restaurantId}:${tableId}:${Date.now()}`;
        const qrTokenHash = crypto.createHmac('sha256', secret).update(qrPayload).digest('hex');
        const qrToken = `${qrTokenHash}.${Date.now()}`;

        const url = `${CLIENT_URL}/menu?r=${restaurantId}&t=${tableId}&token=${qrToken}`;

        console.log('\n--- SETUP COMPLETE ---');
        console.log('Use this URL for browser testing:');
        console.log(url);
        console.log(`JSON_RESULT:{"url":"${url}","restaurantId":"${restaurantId}","tableId":"${tableId}","token":"${token}"}`);

    } catch (e) {
        console.error('Setup failed:', e.response?.data || e.message);
    }
}

run();
