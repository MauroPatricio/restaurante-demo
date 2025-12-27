import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import MenuItem from '../../src/models/MenuItem.js';
import Category from '../../src/models/Category.js';
import Order from '../../src/models/Order.js';

describe('Orders E2E Tests', () => {
    let restaurantId;
    let menuItemId;
    let categoryId;

    beforeAll(async () => {
        // Create test user FIRST
        const testUser = await User.create({
            name: 'Orders Test Owner',
            email: randomEmail(),
            password: 'Test@1234',
            phone: randomPhone(),
        });

        // Create test restaurant WITH OWNER
        const restaurant = await Restaurant.create({
            name: 'Test Restaurant Orders',
            email: randomEmail(),
            phone: randomPhone(),
            address: 'Test Address',
            currency: 'MZN',
            timezone: 'Africa/Maputo',
            owner: testUser._id  // Add owner field
        });
        restaurantId = restaurant._id;

        // Create subscription for restaurant to pass checkSubscription middleware
        const { createTestSubscription, updateRestaurantSubscription } = await import('../helpers/utils.js');
        const subscription = await createTestSubscription(restaurantId);
        await updateRestaurantSubscription(restaurantId, subscription._id);

        // Create category
        const category = await Category.create({
            restaurant: restaurantId,
            name: 'Test Category',
            displayOrder: 1
        });
        categoryId = category._id;

        // Create menu item
        const menuItem = await MenuItem.create({
            restaurant: restaurantId,
            name: 'Test Dish',
            category: categoryId,
            price: 250,
            available: true
        });
        menuItemId = menuItem._id;
    });

    afterAll(async () => {
        // Cleanup
        await Order.deleteMany({ restaurant: restaurantId });
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('POST /api/orders', () => {
        it('should create a new order successfully', async () => {
            const orderData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Test Customer',
                orderType: 'dine-in',
                items: [
                    {
                        item: menuItemId.toString(),
                        qty: 2
                    }
                ]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Order created successfully');
            expect(response.body).toHaveProperty('order');
            expect(response.body.order).toHaveProperty('id');
            expect(response.body.order).toHaveProperty('total');
            expect(response.body.order.total).toBeGreaterThan(0);
        });

        it('should fail when menu item is not available', async () => {
            // Create unavailable menu item
            const unavailableItem = await MenuItem.create({
                restaurant: restaurantId,
                name: 'Unavailable Dish',
                category: categoryId,
                price: 100,
                available: false
            });

            const orderData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                items: [
                    {
                        item: unavailableItem._id.toString(),
                        qty: 1
                    }
                ]
            };

            await request(app)
                .post('/api/orders')
                .send(orderData)
                .expect(400);
        });
    });

    describe('GET /api/orders/restaurant/:restaurantId', () => {
        let authToken;

        beforeAll(async () => {
            // Create user and login
            const userData = {
                name: 'Orders Test User',
                email: randomEmail(),
                password: 'Test@1234',
                phone: randomPhone(),
            };

            await request(app)
                .post('/api/auth/register')
                .send(userData);

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userData.email,
                    password: userData.password
                });

            authToken = loginResponse.body.token;

            // Create a test order
            await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'dine-in',
                items: [{ item: menuItemId, qty: 1, itemPrice: 250, subtotal: 250 }],
                subtotal: 250,
                total: 250,
                status: 'pending'
            });
        });

        it('should get all orders for a restaurant', async () => {
            const response = await request(app)
                .get(`/api/orders/restaurant/${restaurantId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('orders');
            expect(Array.isArray(response.body.orders)).toBe(true);
            expect(response.body.orders.length).toBeGreaterThan(0);
        });
    });
});
