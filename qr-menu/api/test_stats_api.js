import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const userId = '695246e8e905ab64485c0485'; // Mauro Correct ID
const restaurantId = '69681ba8c7b7783d2d5f52fe'; // Acassis (pending_activation)

const token = jwt.sign({ userId, restaurantId }, JWT_SECRET, { expiresIn: '1h' });

async function testApi() {
    console.log('Testing /api/accounting/stats with token for Mauro...');
    try {
        const response = await fetch('http://localhost:5000/api/accounting/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 500) {
            console.log('\n--- ERROR DETAILS ---');
            console.log(data.details || 'No details');
            console.log(data.stack || 'No stack');
        }
    } catch (error) {
        console.error('Fetch failed:', error.message);
    }
}

testApi();
