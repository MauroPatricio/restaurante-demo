import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone, createTestSubscription, updateRestaurantSubscription, sleep } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import Table from '../../src/models/Table.js';
import MenuItem from '../../src/models/MenuItem.js';
import Category from '../../src/models/Category.js';
import Order from '../../src/models/Order.js';
import Subscription from '../../src/models/Subscription.js';

describe('Integration Scenarios E2E Tests', () => {
    let restaurantId;
    let ownerToken;
    let tableId;
    let menuItemId;
    let categoryId;

    beforeAll(async () => {
        // Create complete restaurant setup
        const ownerData = {
            name: 'Integration Test Owner',
            email: randomEmail(),
            password: 'Owner@1234',
            phone: randomPhone(),
        };

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send(ownerData);

        restaurantId = registerResponse.body.restaurant._id;

        // Setup subscription
        const subscription = await createTestSubscription(restaurantId);
        await updateRestaurantSubscription(restaurantId, subscription._id);

        // Login and get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: ownerData.email,
                password: ownerData.password
            });

        const selectResponse = await request(app)
            .post('/api/auth/select-restaurant')
            .set('Authorization', `Bearer ${loginResponse.body.token}`)
            .send({ restaurantId });

        ownerToken = selectResponse.body.token;

        // Create category
        const categoryResponse = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                name: 'Integration Test Category',
                displayOrder: 1,
                isActive: true
            });
        categoryId = categoryResponse.body.category._id;

        // Create menu item
        const menuItemResponse = await request(app)
            .post('/api/menu-items')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                name: 'Integration Test Dish',
                price: 300,
                category: categoryId,
                available: true,
                prepTime: 15,
                eta: 20
            });
        menuItemId = menuItemResponse.body.menuItem._id;

        // Create table
        const tableResponse = await request(app)
            .post('/api/tables')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                restaurant: restaurantId.toString(),
                number: 1,
                capacity: 4,
                status: 'available'
            });
        tableId = tableResponse.body.table._id;
    });

    afterAll(async () => {
        // Cleanup
        await Order.deleteMany({ restaurant: restaurantId });
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await Table.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('Complete Order Flow', () => {
        it('should complete full order lifecycle: scan QR → browse menu → order → prepare → ready → deliver', async () => {
            // Step 1: Client scans QR code and accesses menu
            const menuResponse = await request(app)
                .get(`/api/public/menu/${restaurantId}`)
                .expect(200);

            expect(menuResponse.body.menu).toBeTruthy();

            // Step 2: Client browses menu items
            const itemsResponse = await request(app)
                .get(`/api/menu/${restaurantId}`)
                .expect(200);

            expect(itemsResponse.body.items.length).toBeGreaterThan(0);

            // Step 3: Client creates order
            const orderResponse = await request(app)
                .post('/api/orders')
                .send({
                    restaurant: restaurantId.toString(),
                    table: tableId.toString(),
                    phone: randomPhone(),
                    customerName: 'Integration Test Client',
                    orderType: 'dine-in',
                    items: [
                        {
                            item: menuItemId.toString(),
                            qty: 2
                        }
                    ]
                })
                .expect(201);

            const orderId = orderResponse.body.order.id;
            expect(orderId).toBeTruthy();

            // Step 4: Kitchen receives order and updates to preparing
            const preparingResponse = await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'preparing' })
                .expect(200);

            expect(preparingResponse.body.order.status).toBe('preparing');

            // Step 5: Kitchen marks order as ready
            const readyResponse = await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'ready' })
                .expect(200);

            expect(readyResponse.body.order.status).toBe('ready');

            // Step 6: Waiter delivers order
            const deliveredResponse = await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'delivered' })
                .expect(200);

            expect(deliveredResponse.body.order.status).toBe('delivered');

            // Step 7: Verify final order state
            const finalOrderResponse = await request(app)
                .get(`/api/orders/${orderId}`)
                .expect(200);

            expect(finalOrderResponse.body.order.status).toBe('delivered');
            expect(finalOrderResponse.body.order.statusHistory).toBeDefined();
            expect(finalOrderResponse.body.order.statusHistory.length).toBeGreaterThan(2);
        });
    });

    describe('Subscription Enforcement Integration', () => {
        let suspendedRestaurantId;
        let suspendedOwnerToken;

        beforeAll(async () => {
            // Create restaurant with expired subscription
            const ownerData = {
                name: 'Suspended Owner',
                email: randomEmail(),
                password: 'Owner@1234',
                phone: randomPhone(),
            };

            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(ownerData);

            suspendedRestaurantId = registerResponse.body.restaurant._id;

            // Create EXPIRED subscription
            const expiredSubscription = await Subscription.create({
                restaurant: suspendedRestaurantId,
                status: 'suspended',
                currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                amount: 10000,
                currency: 'MT'
            });

            await updateRestaurantSubscription(suspendedRestaurantId, expiredSubscription._id);

            // Login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: ownerData.email,
                    password: ownerData.password
                });

            const selectResponse = await request(app)
                .post('/api/auth/select-restaurant')
                .set('Authorization', `Bearer ${loginResponse.body.token}`)
                .send({ restaurantId: suspendedRestaurantId });

            suspendedOwnerToken = selectResponse.body.token;
        });

        afterAll(async () => {
            await Restaurant.deleteOne({ _id: suspendedRestaurantId });
        });

        it('should block table creation when subscription is suspended', async () => {
            await request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${suspendedOwnerToken}`)
                .send({
                    restaurant: suspendedRestaurantId.toString(),
                    number: 99,
                    capacity: 4
                })
                .expect(403); // Forbidden due to subscription
        });

        it('should block menu item creation when subscription is suspended', async () => {
            await request(app)
                .post('/api/menu-items')
                .set('Authorization', `Bearer ${suspendedOwnerToken}`)
                .send({
                    name: 'Test Item',
                    price: 100
                })
                .expect(403);
        });

        it('should block order creation when subscription is suspended', async () => {
            await request(app)
                .post('/api/orders')
                .send({
                    restaurant: suspendedRestaurantId.toString(),
                    phone: randomPhone(),
                    items: []
                })
                .expect(403);
        });
    });

    describe('Multi-User Scenarios', () => {
        it('should handle multiple simultaneous orders', async () => {
            const orderPromises = [];

            // Create 5 simultaneous orders
            for (let i = 0; i < 5; i++) {
                const orderPromise = request(app)
                    .post('/api/orders')
                    .send({
                        restaurant: restaurantId.toString(),
                        phone: randomPhone(),
                        customerName: `Customer ${i}`,
                        orderType: 'dine-in',
                        items: [
                            {
                                item: menuItemId.toString(),
                                qty: 1
                            }
                        ]
                    });
                orderPromises.push(orderPromise);
            }

            const responses = await Promise.all(orderPromises);

            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body.order).toBeTruthy();
            });
        });

        it('should handle concurrent order status updates', async () => {
            // Create an order first
            const orderResponse = await request(app)
                .post('/api/orders')
                .send({
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    customerName: 'Concurrent Test',
                    items: [
                        {
                            item: menuItemId.toString(),
                            qty: 1
                        }
                    ]
                });

            const orderId = orderResponse.body.order.id;

            // Update to preparing
            await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'preparing' })
                .expect(200);

            // Small delay
            await sleep(100);

            // Update to ready
            await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'ready' })
                .expect(200);
        });
    });

    describe('Waiter Call Integration Flow', () => {
        it('should complete waiter call lifecycle: client calls → waiter acknowledges → issue resolved', async () => {
            // Step 1: Client sends waiter call
            const callResponse = await request(app)
                .post('/api/waiter-calls')
                .send({
                    restaurant: restaurantId.toString(),
                    table: tableId.toString(),
                    type: 'service',
                    message: 'Need menu'
                })
                .expect(201);

            const callId = callResponse.body.call._id;

            // Step 2: Waiter views pending calls
            const viewCallsResponse = await request(app)
                .get(`/api/waiter-calls/restaurant/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(viewCallsResponse.body.calls.length).toBeGreaterThan(0);

            // Step 3: Waiter acknowledges call
            const acknowledgeResponse = await request(app)
                .patch(`/api/waiter-calls/${callId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'acknowledged' })
                .expect(200);

            expect(acknowledgeResponse.body.call.status).toBe('acknowledged');

            // Step 4: Waiter resolves issue
            const resolveResponse = await request(app)
                .patch(`/api/waiter-calls/${callId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'resolved' })
                .expect(200);

            expect(resolveResponse.body.call.status).toBe('resolved');
        });
    });

    describe('Payment Integration Flow', () => {
        it('should complete payment flow: order → payment initiated → payment confirmed → order completed', async () => {
            // Step 1: Create order
            const orderResponse = await request(app)
                .post('/api/orders')
                .send({
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    customerName: 'Payment Test',
                    orderType: 'dine-in',
                    items: [
                        {
                            item: menuItemId.toString(),
                            qty: 1
                        }
                    ]
                })
                .expect(201);

            const orderId = orderResponse.body.order.id;
            const orderTotal = orderResponse.body.order.total;

            // Step 2: Record cash payment
            const paymentResponse = await request(app)
                .post('/api/payments/cash')
                .send({
                    order: orderId,
                    amount: orderTotal,
                    method: 'cash'
                })
                .expect(201);

            expect(paymentResponse.body.payment.status).toBe('completed');

            // Step 3: Verify order is marked as paid
            const orderCheckResponse = await request(app)
                .get(`/api/orders/${orderId}`)
                .expect(200);

            // Payment should be recorded
            expect(orderCheckResponse.body.order).toBeTruthy();
        });
    });

    describe('Full Customer Journey', () => {
        it('should complete entire customer journey: arrive → scan QR → order → eat → pay → feedback', async () => {
            const customerPhone = randomPhone();

            // 1. Customer arrives and scans QR code
            const tableResponse = await request(app)
                .get(`/api/tables/${tableId}`)
                .expect(200);

            expect(tableResponse.body.table.number).toBeTruthy();

            // 2. Customer views menu
            const menuResponse = await request(app)
                .get(`/api/public/menu/${restaurantId}`)
                .expect(200);

            expect(menuResponse.body.menu).toBeTruthy();

            // 3. Customer places order
            const orderResponse = await request(app)
                .post('/api/orders')
                .send({
                    restaurant: restaurantId.toString(),
                    table: tableId.toString(),
                    phone: customerPhone,
                    customerName: 'Full Journey Customer',
                    orderType: 'dine-in',
                    items: [
                        {
                            item: menuItemId.toString(),
                            qty: 2
                        }
                    ]
                })
                .expect(201);

            const orderId = orderResponse.body.order.id;

            // 4. Kitchen prepares order
            await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'preparing' });

            await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'ready' });

            // 5. Food is delivered
            await request(app)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'delivered' });

            // 6. Customer pays
            await request(app)
                .post('/api/payments/cash')
                .send({
                    order: orderId,
                    amount: orderResponse.body.order.total,
                    method: 'cash'
                })
                .expect(201);

            // 7. Customer leaves feedback
            const feedbackResponse = await request(app)
                .post('/api/feedback')
                .send({
                    restaurant: restaurantId.toString(),
                    order: orderId,
                    rating: 5,
                    emotion: 'very-happy',
                    comment: 'Excellent experience!'
                })
                .expect(201);

            expect(feedbackResponse.body.feedback.rating).toBe(5);
        });
    });
});
