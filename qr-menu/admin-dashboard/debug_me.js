import axios from 'axios';

async function run() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://127.0.0.1:4001/api/auth/login', {
            email: 'owner@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Token:', token);

        console.log('Fetching /me...');
        const meRes = await axios.get('http://127.0.0.1:4001/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Me Response:', meRes.data);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

run();
