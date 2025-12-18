import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api';
let TOKEN = '';
let RESTAURANT_ID = '';
let USER_ID = '';
let TABLE_ID = '';
let MENU_ITEM_ID = '';

const COLORS = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

function log(msg, type = 'info') {
    let color = COLORS.reset;
    if (type === 'success') color = COLORS.green;
    if (type === 'error') color = COLORS.red;
    if (type === 'warn') color = COLORS.yellow;
    if (type === 'step') color = COLORS.cyan;
    console.log(`${color}${msg}${COLORS.reset}`);
}

async function request(endpoint, method = 'GET', body = null, token = TOKEN) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        const data = await res.json();
        return { status: res.status, data };
    } catch (e) {
        log(`Request Error: ${e.message}`, 'error');
        return { status: 500, error: e.message };
    }
}

async function runTests() {
    log('🚀 Starting CRUD Test Suite...', 'step');
    const unique = Date.now();

    // ==========================================
    // 1. AUTH & SETUP
    // ==========================================
    log('\n📦 [1/4] Setting up Environment (Auth & Context)...', 'step');

    // Register
    const registerData = {
        name: 'Crud Tester',
        email: `crud.${unique}@example.com`,
        password: 'Password123!',
        phone: `84${unique.toString().slice(-7)}`,
        restaurantName: `Crud Resto ${unique}`,
        restaurantAddress: 'Test Lane 1'
    };

    let res = await request('/auth/register', 'POST', registerData);
    if (res.status === 201) {
        TOKEN = res.data.token;
        RESTAURANT_ID = res.data.restaurant.id;
        USER_ID = res.data.user.id;
        log(`✅ Registered User & Restaurant: ${registerData.restaurantName}`, 'success');
    } else {
        log(`❌ Registration Failed: ${JSON.stringify(res.data)}`, 'error');
        process.exit(1);
    }

    // Login (Double check)
    res = await request('/auth/login', 'POST', { email: registerData.email, password: registerData.password });
    if (res.status === 200) {
        log('✅ Login Successful', 'success');
        // Initial token is global, we need restaurant context for some ops if strictly required, 
        // but register returns a token that usually works for initial setup.
        // However, let's switch context to be sure.

        const switchRes = await request('/auth/select-restaurant', 'POST', { restaurantId: RESTAURANT_ID }, res.data.token);
        if (switchRes.status === 200) {
            TOKEN = switchRes.data.token;
            log('✅ Switched to Restaurant Context', 'success');
        } else {
            log('⚠️ Context Switch failed, proceeding with global token (might fail for some routes)', 'warn');
        }
    } else {
        log('❌ Login Failed', 'error');
    }


    // ==========================================
    // 2. TABLES CRUD
    // ==========================================
    log('\n🪑 [2/4] Testing TABLES CRUD...', 'step');

    // CREATE
    const tableData = {
        restaurant: RESTAURANT_ID,
        number: 101,
        capacity: 4,
        location: 'Patio',
        type: 'standard'
    };
    res = await request('/tables', 'POST', tableData);
    if (res.status === 201) {
        TABLE_ID = res.data.table._id;
        log('✅ CREATE Table: Success', 'success');
    } else {
        log(`❌ CREATE Table Failed: ${JSON.stringify(res.data)}`, 'error');
    }

    // READ (All)
    res = await request(`/tables/restaurant/${RESTAURANT_ID}`);
    if (res.status === 200 && res.data.tables.length > 0) {
        log(`✅ READ Tables (List): Found ${res.data.tables.length} tables`, 'success');
    } else {
        log(`❌ READ Tables (List) Failed or Empty`, 'error');
    }

    // READ (Single)
    if (TABLE_ID) {
        res = await request(`/tables/${TABLE_ID}`);
        if (res.status === 200 && res.data.table.number === 101) {
            log('✅ READ Table (Single): Verified details', 'success');
        } else {
            log(`❌ READ Table (Single) Failed`, 'error');
        }
    }

    // UPDATE
    if (TABLE_ID) {
        res = await request(`/tables/${TABLE_ID}`, 'PATCH', { capacity: 6 });
        if (res.status === 200 && res.data.table.capacity === 6) {
            log('✅ UPDATE Table: Capacity changed to 6', 'success');
        } else {
            log(`❌ UPDATE Table Failed`, 'error');
        }
    }

    // DELETE
    if (TABLE_ID) {
        res = await request(`/tables/${TABLE_ID}`, 'DELETE');
        if (res.status === 200) {
            log('✅ DELETE Table: Success', 'success');
        } else {
            log(`❌ DELETE Table Failed`, 'error');
        }
    } else {
        log('⚠️ Skipping Table Delete (No ID)', 'warn');
    }


    // ==========================================
    // 3. MENU ITEMS CRUD
    // ==========================================
    log('\n🍔 [3/4] Testing MENU ITEMS CRUD...', 'step');

    // CREATE
    const menuData = {
        name: 'Test Burger',
        price: 500,
        description: 'Juicy test burger',
        category: 'Mains',
        available: true,
        restaurant: RESTAURANT_ID // Often required in body too
    };
    res = await request('/menu-items', 'POST', menuData);
    if (res.status === 201) {
        MENU_ITEM_ID = res.data.menuItem._id;
        log('✅ CREATE Menu Item: Success', 'success');
    } else {
        log(`❌ CREATE Menu Item Failed: ${JSON.stringify(res.data)}`, 'error');
    }

    // READ (List)
    res = await request(`/menu/${RESTAURANT_ID}`);
    if (res.status === 200 && res.data.items.some(i => i._id === MENU_ITEM_ID)) {
        log('✅ READ Menu (List): Item found', 'success');
    } else {
        log(`❌ READ Menu (List) Failed`, 'error');
    }

    // UPDATE
    if (MENU_ITEM_ID) {
        res = await request(`/menu-items/${MENU_ITEM_ID}`, 'PATCH', { price: 550 });
        if (res.status === 200 && res.data.menuItem.price === 550) {
            log('✅ UPDATE Menu Item: Price changed to 550', 'success');
        } else {
            log(`❌ UPDATE Menu Item Failed`, 'error');
        }
    }

    // DELETE
    if (MENU_ITEM_ID) {
        res = await request(`/menu-items/${MENU_ITEM_ID}`, 'DELETE');
        if (res.status === 200) {
            log('✅ DELETE Menu Item: Success', 'success');
        } else {
            log(`❌ DELETE Menu Item Failed`, 'error');
        }
    }


    // ==========================================
    // 4. USERS CRUD
    // ==========================================
    log('\n👤 [4/4] Testing USERS CRUD...', 'step');

    // READ PROFILE
    res = await request('/auth/me');
    if (res.status === 200 && res.data.user.email === registerData.email) {
        log('✅ READ Profile: Verified User', 'success');
    } else {
        log(`❌ READ Profile Failed`, 'error');
    }

    // UPDATE PROFILE (e.g. Password - specific endpoint)
    // There isn't a direct "Update User" endpoint for self in the routes we saw, 
    // except specific ones like change-password or fcm-token. 
    // Usually Admin uses `/users/:id`. Let's try `change-password`.

    res = await request('/auth/change-password', 'POST', {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456!'
    });

    if (res.status === 200) {
        log('✅ UPDATE Profile: Password Changed Successfully', 'success');

        // Verify Login with new password
        const loginCheck = await request('/auth/login', 'POST', {
            email: registerData.email,
            password: 'NewPassword456!'
        });

        if (loginCheck.status === 200) {
            log('✅ VERIFY: Login with new password worked', 'success');
        } else {
            log('❌ VERIFY: Login with new password failed', 'error');
        }

    } else {
        log(`❌ UPDATE Profile (Password) Failed: ${JSON.stringify(res.data)}`, 'error');
    }

    log('\n🎉 CRUD Test Suite Completed.', 'step');
}

runTests();
