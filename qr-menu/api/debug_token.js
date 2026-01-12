import { validateTableToken, generateTableToken } from './src/utils/qrSecurity.js';

const restaurantId = '695fe59bd9193b05e3c59209';
const tableId = '696515b99f3e8d05eb44f984'; // Updated table ID
const tokenFromUrl = '6f72586dad9c1eb5aa202031c11f2bb64abb3314bd477de03fbed93e5d32d31a.1768232377493';

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
