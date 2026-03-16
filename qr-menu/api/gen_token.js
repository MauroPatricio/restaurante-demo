import { generateTableToken } from './src/utils/qrSecurity.js';
import dotenv from 'dotenv';
dotenv.config();

const restaurantId = '695fe59bd9193b05e3c59209';
const tableId = '696893a45e861470af363318';

const token = generateTableToken(restaurantId, tableId);
console.log(`Token: ${token}`);
console.log(`URL: http://localhost:5175/menu/${restaurantId}?t=${tableId}&token=${token}`);
