/**
 * Staff Analytics Seed Script
 * Creates realistic demo data for Waiter + Kitchen analytics
 *
 * Usage: node src/scripts/seedStaffAnalytics.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

// ─── Models ───────────────────────────────────────────────────────────────────
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import UserRestaurantRole from '../models/UserRestaurantRole.js';
import Role from '../models/Role.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import WaiterCall from '../models/WaiterCall.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// randFloat available if needed
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/** Create a date within the last N days, with realistic meal-time hours */
function pastDate(daysAgo, hourOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const mealHours = [7, 8, 9, 12, 13, 14, 19, 20, 21, 22];
    d.setHours(pick(mealHours) + hourOffset, rand(0, 59), rand(0, 59), 0);
    return d;
}

/** Add minutes to a date */
const addMinutes = (date, min) => new Date(date.getTime() + min * 60000);

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // ── Find the first active restaurant ──────────────────────────────────
        const restaurant = await Restaurant.findOne({ active: { $ne: false } });
        if (!restaurant) {
            console.error('❌ No restaurant found. Create one first via the app.');
            process.exit(1);
        }
        console.log(`🏪 Restaurant: ${restaurant.name} (${restaurant._id})`);

        // ── Find or create the Waiter role ────────────────────────────────────
        let waiterRole = await Role.findOne({ name: { $in: ['Waiter', 'Garçom', 'waiter'] } });
        if (!waiterRole) {
            waiterRole = await Role.create({
                name: 'Waiter',
                displayName: 'Garçom',
                permissions: ['place_order', 'view_tables'],
                isSystem: false,
                isOwner: false
            });
            console.log('✅ Created Waiter role');
        }
        console.log(`👤 Waiter role: ${waiterRole.name} (${waiterRole._id})`);

        // ── Create 4 demo waiters ─────────────────────────────────────────────
        const waiterData = [
            { name: 'Ana Macuácua', email: 'ana.waiter@demo.com' },
            { name: 'Carlos Mondlane', email: 'carlos.waiter@demo.com' },
            { name: 'Fátima Sitoe', email: 'fatima.waiter@demo.com' },
            { name: 'João Nhantumbo', email: 'joao.waiter@demo.com' }
        ];

        const waiters = [];
        for (const wd of waiterData) {
            let u = await User.findOne({ email: wd.email });
            if (!u) {
                u = await User.create({
                    name: wd.name,
                    email: wd.email,
                    phone: `+258${rand(820000000, 869999999)}`,
                    password: '$2b$10$K9L1OywQLPZRaEGIJMUqrObz/KoAqUgRk0TJpT8TiKQZ.b8dJpg3S', // demo123
                    active: true
                });
                console.log(`  ✅ Created waiter: ${u.name}`);
            }

            // Assign to restaurant as Waiter
            let urr = await UserRestaurantRole.findOne({ user: u._id, restaurant: restaurant._id });
            if (!urr) {
                await UserRestaurantRole.create({
                    user: u._id,
                    restaurant: restaurant._id,
                    role: waiterRole._id
                });
            }
            waiters.push(u);
        }
        console.log(`👥 ${waiters.length} waiters ready`);

        // ── Get or create tables ──────────────────────────────────────────────
        let tables = await Table.find({ restaurant: restaurant._id }).limit(10);
        if (tables.length < 4) {
            for (let i = tables.length + 1; i <= 10; i++) {
                const t = await Table.create({
                    restaurant: restaurant._id,
                    number: i,
                    location: pick(['Sala Principal', 'Esplanada', 'Varanda', 'VIP']),
                    capacity: pick([2, 4, 4, 6, 8]),
                    status: 'free',
                    qrCode: `DEMO-TABLE-${i}`
                });
                tables.push(t);
            }
            console.log(`🪑 Created ${tables.length} tables`);
        }

        // ── Get menu items ────────────────────────────────────────────────────
        let menuItems = await MenuItem.find({ restaurant: restaurant._id, active: { $ne: false } }).limit(20);
        if (menuItems.length < 5) {
            const demoItems = [
                { name: 'Camarão Grelhado', price: 350, category: 'Pratos Principais', prepTime: 20 },
                { name: 'Frango à Africana', price: 250, category: 'Pratos Principais', prepTime: 15 },
                { name: 'Prego no Pão', price: 150, category: 'Snacks', prepTime: 10 },
                { name: 'Matapa com Arroz', price: 200, category: 'Pratos Principais', prepTime: 25 },
                { name: 'Cachupa', price: 180, category: 'Pratos Principais', prepTime: 30 },
                { name: 'Sumo de Mango', price: 60, category: 'Bebidas', prepTime: 3 },
                { name: '2M Cerveja', price: 80, category: 'Bebidas', prepTime: 2 },
                { name: 'Água Mineral', price: 40, category: 'Bebidas', prepTime: 1 },
                { name: 'Bolo de Coco', price: 90, category: 'Sobremesas', prepTime: 5 },
                { name: 'Gelado de Maracujá', price: 75, category: 'Sobremesas', prepTime: 4 }
            ];
            for (const item of demoItems) {
                const mi = await MenuItem.create({
                    restaurant: restaurant._id,
                    name: item.name,
                    price: item.price,
                    category: item.category,
                    active: true,
                    estimatedPrepTime: item.prepTime,
                    currency: restaurant.settings?.currency || 'MZN'
                });
                menuItems.push(mi);
            }
            console.log(`🍽️ Created ${demoItems.length} menu items`);
        }

        // ── Generate 30 days of realistic orders ──────────────────────────────
        console.log('\n📊 Generating 30 days of order history...');
        let ordersCreated = 0;

        // Remove existing seed orders for clean re-run
        await Order.deleteMany({ restaurant: restaurant._id, source: 'waiter', phone: /^SEED/ });

        for (let day = 0; day < 30; day++) {
            // Each day: 3–9 orders spread across meal times
            const ordersPerDay = rand(3, 9);

            for (let o = 0; o < ordersPerDay; o++) {
                const waiter = pick(waiters);
                const table = pick(tables);
                const orderDate = pastDate(day, o * 0.5);

                // 2–4 items per order
                const numItems = rand(2, 4);
                const selectedItems = [];
                let subtotal = 0;

                for (let i = 0; i < numItems; i++) {
                    const mi = pick(menuItems);
                    const qty = rand(1, 3);
                    const price = mi.price || rand(80, 400);
                    selectedItems.push({
                        item: mi._id,
                        qty,
                        itemPrice: price,
                        subtotal: price * qty
                    });
                    subtotal += price * qty;
                }

                const prepMinutes = rand(8, 35);
                const confirmedAt = addMinutes(orderDate, 1);
                const readyAt = addMinutes(orderDate, prepMinutes);
                const completedAt = addMinutes(orderDate, prepMinutes + rand(2, 8));
                const isDelayed = prepMinutes > 25;

                const order = await Order.create({
                    restaurant: restaurant._id,
                    table: table._id,
                    tableNumber: table.number,
                    orderType: 'dine-in',
                    items: selectedItems,
                    subtotal,
                    total: subtotal,
                    discount: 0,
                    tax: 0,
                    currency: 'MZN',
                    phone: `SEED-${waiter._id}-${day}-${o}`,
                    customerName: pick(['', 'Cliente VIP', 'Mesa ' + table.number, '']),
                    paymentMethod: pick(['cash', 'mpesa', 'cash', 'cash']),
                    paymentStatus: 'completed',
                    status: 'completed',
                    source: 'waiter',
                    createdByWaiter: waiter._id,
                    estimatedReadyTime: readyAt,
                    actualReadyTime: readyAt,
                    completedAt,
                    statusHistory: [
                        { status: 'pending',    timestamp: orderDate,    updatedBy: waiter._id },
                        { status: 'confirmed',  timestamp: confirmedAt,  updatedBy: waiter._id },
                        { status: 'preparing',  timestamp: addMinutes(orderDate, 2), updatedBy: waiter._id },
                        { status: 'ready',      timestamp: readyAt,      updatedBy: waiter._id },
                        { status: 'served',     timestamp: addMinutes(readyAt, 2),   updatedBy: waiter._id },
                        { status: 'completed',  timestamp: completedAt,  updatedBy: waiter._id }
                    ],
                    createdAt: orderDate,
                    updatedAt: completedAt
                });

                ordersCreated++;
            }

            // Each day: 0–3 waiter calls (correctly seeded with schema fields)
            const calls = rand(0, 3);
            for (let c = 0; c < calls; c++) {
                const waiter = pick(waiters);
                const callDate = pastDate(day, c * 0.3);
                const resolvedAt = addMinutes(callDate, rand(1, 8));
                await WaiterCall.create({
                    restaurant: restaurant._id,
                    table: pick(tables)._id,
                    waiter: waiter._id,         // ← correct field name
                    resolvedBy: waiter._id,     // ← used by analytics controller
                    type: 'call',               // ← required enum field
                    status: 'resolved',
                    resolvedAt,
                    createdAt: callDate,
                    updatedAt: resolvedAt
                });
            }
        }

        console.log(`\n✅ Seed complete!`);
        console.log(`   📦 Orders created: ${ordersCreated}`);
        console.log(`   👥 Waiters: ${waiters.map(w => w.name).join(', ')}`);
        console.log(`\n🌐 Now open: http://localhost:5173/dashboard/waiter-analytics`);
        console.log(`🌐 Kitchen:  http://localhost:5173/dashboard/kitchen-analytics`);

    } catch (err) {
        console.error('❌ Seed error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
