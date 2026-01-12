import { validateTableToken, generateTableToken } from './src/utils/qrSecurity.js';

const restaurantId = '695fe59bd9193b05e3c59209';
const tableId = '69651d35fed50f3f9c4de135'; // New table ID from URL
const tokenFromUrl = '155cf404dd639ed98e199c649bb3df4430f6999b785ddf49969be8e2c9afc90e.1768234293834';

console.log('--- Debugging Token ---');
console.log('Provided Token:', tokenFromUrl);

const isValid = validateTableToken(tokenFromUrl, restaurantId, tableId);
console.log('Is Valid with CURRENT env:', isValid);

if (!isValid) {
    console.log('\n--- Generating Expected Token ---');
    const expected = generateTableToken(restaurantId, tableId);
    console.log('Generated (new timestamp):', expected);

    // Try to match the HASH part using the timestamp from the URL
    const timestamp = tokenFromUrl.split('.')[1];
    import('crypto').then(crypto => {
        const secret = process.env.QR_SECRET || 'default-qr-secret-change-in-production';
        const payload = `${restaurantId}:${tableId}:${timestamp}`;
        const hash = crypto.default.createHmac('sha256', secret).update(payload).digest('hex');
        console.log('Expected Hash for timestamp ' + timestamp + ':', hash);
        console.log('Matches provided?', hash === tokenFromUrl.split('.')[0]);
    });
}
