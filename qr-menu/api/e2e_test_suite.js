import fetch from 'node-fetch';

// CONFIG
const PORTS = [4000, 4001, 5000, 3000];
let API_URL = '';

// STATE
let TOKEN = '';
let RESTAURANT_ID = '';
let TABLE_ID = '';
let TABLE_NUMBER = 99;
let ITEM_ID = '';
let ORDER_ID = '';
let USER_ID = '';

const log = (msg, type = 'info') => {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
    console.log(`${icons[type] || '•'} [${type.toUpperCase()}] ${msg}`);
};

const delay = ms => new Promise(r => setTimeout(r, ms));

async function findActivePort() {
    for (const port of PORTS) {
        try {
            const res = await fetch(`http://localhost:${port}/health`);
            if (res.status === 200) {
                API_URL = `http://localhost:${port}/api`;
                log(`Found active API at http://localhost:${port}`, 'success');
                return true;
            }
        } catch (e) { }
    }
    return false;
}

async function request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, opts);
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text;
        }
        return { status: res.status, data };
    } catch (e) {
        log(`Request failed: ${e.message}`, 'error');
        return { status: 0, error: e };
    }
}

async function runTest() {
    log('Waiting for API to start...');
    let attempts = 0;
    while (!(await findActivePort())) {
        attempts++;
        if (attempts > 30) { // 30 * 2s = 60s
            log('Could not find active API. Exiting.', 'error');
            process.exit(1);
        }
        await delay(2000);
    }

    log('Starting Full E2E Test Sequence...', 'info');

    // 1. REGISTER
    const unique = Date.now();
    const email = `test.owner.${unique}@example.com`;
    const password = 'Password123!';

    log(`Step 1: Registering User (${email})...`);
    let res = await request('/auth/register', 'POST', {
        name: 'E2E Tester',
        email,
        password,
        phone: '840000000',
        restaurantName: `E2E Resto ${unique}`,
        restaurantAddress: '123 Test St'
    });

    if (res.status === 201) {
        log('Registration Successful', 'success');
        // Initial token is global, but usually register returns user, restaurant and token.
        // If the registration logic automatically logs us into the restaurant context or gives a global token...
        // The endpoint returns: { token, user, restaurant ... }
        // The token returned by register is usually specific to the user.
        TOKEN = res.data.token;
        RESTAURANT_ID = res.data.restaurant.id;
        USER_ID = res.data.user.id;
    } else {
        log(`Registration Failed: ${JSON.stringify(res.data)}`, 'error');
        process.exit(1);
    }

    // 2. CONTEXT SWITCH (To get Restaurant Scoped Token)
    log('Step 2: Switching Context (Select Restaurant)...');
    res = await request('/auth/select-restaurant', 'POST', { restaurantId: RESTAURANT_ID }, TOKEN);
    if (res.status === 200) {
        TOKEN = res.data.token; // Update to Scoped Token
        log('Context Switched & Token Updated', 'success');
    } else {
        log(`Context Switch Failed: ${JSON.stringify(res.data)}`, 'error');
        process.exit(1);
    }

    // 3. CREATE TABLE
    log('Step 3: Creating Table...');
    res = await request('/tables', 'POST', {
        restaurant: RESTAURANT_ID,
        number: TABLE_NUMBER,
        capacity: 4,
        type: 'standard',
        location: 'indoor'
    }, TOKEN);

    if (res.status === 201) {
        TABLE_ID = res.data.table._id;
        log(`Table Created (ID: ${TABLE_ID})`, 'success');
    } else {
        log(`Table Creation Failed: ${JSON.stringify(res.data)}`, 'error');
        // Continue? No, we need table for order.
        process.exit(1);
    }

    // 4. CREATE MENU ITEM
    log('Step 4: Creating Menu Item...');
    res = await request('/menu-items', 'POST', {
        name: 'E2E Burger',
        price: 500,
        description: 'Delicious test burger',
        category: 'Main',
        available: true,
        eta: 10
    }, TOKEN);

    if (res.status === 201) {
        ITEM_ID = res.data.menuItem._id;
        log('Menu Item Created', 'success');
    } else {
        log(`Menu Item Creation Failed: ${JSON.stringify(res.data)}`, 'error');
        process.exit(1);
    }

    // 5. CREATE ORDER (Simulating User)
    // IMPORTANT: Verify if Public Order works without Token, or fails due to Middleware
    log('Step 5: Creating Order (Simulating Guest)...');
    const orderPayload = {
        restaurant: RESTAURANT_ID,
        table: TABLE_ID,
        items: [{ item: ITEM_ID, qty: 2 }],
        customerName: 'Guest User',
        phone: '849999999',
        orderType: 'dine-in'
    };

    // Try without token (Public)
    res = await request('/orders', 'POST', orderPayload, null);

    if (res.status === 201) {
        ORDER_ID = res.data.order.id;
        log(`Order Created Successfully (Public)! ID: ${ORDER_ID}`, 'success');
    } else {
        log(`Public Order Creation Failed: ${res.status} - ${JSON.stringify(res.data)}`, 'error');
        log('Attempting with Token (Fallback)...', 'warn');
        // Retry with token to see if it's an auth issue
        res = await request('/orders', 'POST', orderPayload, TOKEN);
        if (res.status === 201) {
            ORDER_ID = res.data.order.id;
            log(`Order Created With Token! ID: ${ORDER_ID}`, 'success');
        } else {
            log(`Authenticated Order Creation Failed too: ${JSON.stringify(res.data)}`, 'error');
        }
    }

    if (ORDER_ID) {
        // 6. UPDATE ORDER STATUS (Kitchen)
        log('Step 6: Updating Order Status (Kitchen Flow)...');
        const statuses = ['preparing', 'ready'];
        for (const status of statuses) {
            await delay(1000);
            res = await request(`/orders/${ORDER_ID}`, 'PATCH', { status }, TOKEN);
            if (res.status === 200) {
                log(`Status updated to: ${status}`, 'success');
            } else {
                log(`Failed to update status ${status}: ${JSON.stringify(res.data)}`, 'error');
            }
        }

        // 7. PAYMENT (Cash)
        log('Step 7: Processing Cash Payment...');
        res = await request('/payments/cash', 'POST', {
            orderId: ORDER_ID,
            amount: 1000,
            receiptNumber: 'REC-001',
            notes: 'E2E Test'
        }, TOKEN);

        if (res.status === 200) {
            log('Payment Recorded', 'success');
        } else {
            log(`Payment Failed: ${JSON.stringify(res.data)}`, 'error');
        }

        // 8. VERIFY FINAL STATUS
        res = await request(`/orders/${ORDER_ID}`, 'GET', null, TOKEN);
        if (res.data.order && res.data.order.status === 'completed') {
            // Logic: usually payment changes state to paid/completed? 
            // Need to check if payment route updates order.
            // Payment service usually calls order update.
            log(`Final Order Status: ${res.data.order.status}`, 'info');
        }
    }

    // 9. ANALYTICS CHECK
    log('Step 9: Checking Analytics...');
    // We need dates
    const today = new Date().toISOString().split('T')[0];
    res = await request(`/orders/restaurant/${RESTAURANT_ID}?startDate=${today}&endDate=${today}T23:59:59`, 'GET', null, TOKEN);
    if (res.status === 200) {
        log(`Found ${res.data.orders.length} orders in analytics`, 'success');
    } else {
        log(`Analytics Check Failed: ${JSON.stringify(res.data)}`, 'error');
    }

    log('E2E Test Sequence Complete.', 'info');
}

runTest();
