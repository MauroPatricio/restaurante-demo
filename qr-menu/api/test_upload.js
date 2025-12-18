import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:4000/api';
const LOGO_PATH = 'd:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\vite.svg';

async function testUpload() {
    try {
        const unique = Date.now();
        const form = new FormData();

        form.append('name', 'Upload Tester');
        form.append('email', `upload.test.${unique}@example.com`);
        form.append('password', 'Password123!');
        form.append('phone', `84${unique.toString().slice(-7)}`);
        form.append('restaurantName', `Cloud Resto ${unique}`);
        form.append('restaurantAddress', 'Cloud St');

        if (fs.existsSync(LOGO_PATH)) {
            form.append('image', fs.createReadStream(LOGO_PATH));
            console.log('📎 Attaching file:', LOGO_PATH);
        } else {
            console.error('❌ File not found:', LOGO_PATH);
            return;
        }

        console.log('🚀 Sending Registration Request...');
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            body: form
        });

        const data = await res.json();

        if (res.ok) {
            console.log('✅ Registration Successful!');
            const logo = data.restaurant.logo;
            console.log('🖼️  Restaurant Logo URL:', logo);

            if (logo && logo.startsWith('http')) {
                console.log('✅ Logo URL is valid.');
                console.log(`🔗 Client URL: http://localhost:5174/menu/${data.restaurant.id}`);
            } else {
                console.error('❌ Logo URL is missing or invalid.');
            }
        } else {
            console.error('❌ Registration Failed:', data);
        }

    } catch (e) {
        console.error('❌ Error:', e);
    }
}

testUpload();
