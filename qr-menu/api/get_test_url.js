import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api';

async function getUrl() {
    try {
        // 1. Login with known E2E credentials
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test.owner.1766048865565@example.com', password: 'Password123!' })
        });

        const loginData = await loginRes.json();

        if (!loginData.token) {
            // Fallback: try to register a NEW one if that one is gone
            console.log('Login failed, registering new user...');
            const unique = Date.now();
            const regRes = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Auto Tester',
                    email: `auto.${unique}@test.com`,
                    password: 'Password123!',
                    phone: '840000000',
                    restaurantName: 'Auto Resto',
                    restaurantAddress: 'Test St'
                })
            });
            const regData = await regRes.json();
            if (regData.token) {
                const rId = regData.restaurant.id;
                console.log(`URL: http://localhost:5174/menu/${rId}`);
                return;
            } else {
                console.error('Registration failed');
                return;
            }
        }

        const rId = loginData.user.restaurants[0]._id;

        // Get tables
        const token = loginData.token;
        // Need scoped token? No, global token usually works for gathering info if user is owner, 
        // OR we need to switch context. 
        // Let's just use the Restaurant ID found in user profile.

        console.log(`URL: http://localhost:5174/menu/${rId}`);

    } catch (e) {
        console.error(e);
    }
}

getUrl();
