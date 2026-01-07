import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone, createTestSubscription, updateRestaurantSubscription } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import Table from '../../src/models/Table.js';
import MenuItem from '../../src/models/MenuItem.js';
import Category from '../../src/models/Category.js';
import Order from '../../src/models/Order.js';
import Coupon from '../../src/models/Coupon.js';
import Feedback from '../../src/models/Feedback.js';
import WaiterCall from '../../src/models/WaiterCall.js';
import ClientReaction from '../../src/models/ClientReaction.js';

describe('Client Workflows E2E Tests', () => {
    let restaurantId;
    let tableId;
    let categoryId;
    let menuItemId;
    let orderId;
    let validCouponCode;
    let clientPhone;

    beforeAll(async () => {
        clientPhone = randomPhone();

        // Setup: Create restaurant and menu
        const owner = await User.create({
            name: 'Test Owner',
            email: randomEmail(),
            password: 'Test@1234',
            phone: randomPhone(),
        });

        const restaurant = await Restaurant.create({
            name: 'Client Test Restaurant',
            email: randomEmail(),
            phone: randomPhone(),
            address: 'Test Address',
            currency: 'MZN',
            timezone: 'Africa/Maputo',
            owner: owner._id,
            settings: {
                taxRate: 17,
                serviceChargeRate: 10
            }
        });
        restaurantId = restaurant._id;

        // Create subscription
        const subscription = await createTestSubscription(restaurantId);
        await updateRestaurantSubscription(restaurantId, subscription._id);

        // Create category and menu items
        const category = await Category.create({
            restaurant: restaurantId,
            name: 'Main Dishes',
            displayOrder: 1,
            isActive: true
        });
        categoryId = category._id;

        const menuItem = await MenuItem.create({
            restaurant: restaurantId,
            name: 'Grilled Chicken',
            description: 'Delicious grilled chicken',
            price: 250,
            category: categoryId,
            available: true,
            prepTime: 15,
            eta: 20
        });
        menuItemId = menuItem._id;

        // Create additional menu items
        await MenuItem.create({
            restaurant: restaurantId,
            name: 'Beef Steak',
            description: 'Premium beef steak',
            price: 450,
            category: categoryId,
            available: true,
            prepTime: 20,
            eta: 25
        });

        // Create table with QR code
        const table = await Table.create({
            restaurant: restaurantId,
            number: 5,
            capacity: 4,
            qrCode: 'test-qr-code-data',
            status: 'available'
        });
        tableId = table._id;

        // Create valid coupon
        const coupon = await Coupon.create({
            restaurant: restaurantId,
            code: 'WELCOME10',
            discountType: 'percentage',
            discountValue: 10,
            minOrderAmount: 100,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            usageLimit: 100,
            isActive: true
        });
        validCouponCode = coupon.code;
    });

    afterAll(async () => {
        // Cleanup
        await ClientReaction.deleteMany({ restaurant: restaurantId });
        await WaiterCall.deleteMany({ restaurant: restaurantId });
        await Feedback.deleteMany({ restaurant: restaurantId });
        await Order.deleteMany({ restaurant: restaurantId });
        await Coupon.deleteMany({ restaurant: restaurantId });
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await Table.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('QR Code Access and Menu Browsing', () => {
        it('should access menu via QR code (public route)', async () => {
            const response = await request(app)
                .get(`/api/public/menu/${restaurantId}`)
                .expect(200);

            expect(response.body).toHaveProperty('menu');
            expect(response.body).toHaveProperty('restaurant');
            expect(response.body.restaurant).toBe(restaurantId.toString());
        });

        it('should get table details for QR scan', async () => {
            const response = await request(app)
                .get(`/api/tables/${tableId}`)
                .expect(200);

            expect(response.body).toHaveProperty('table');
            expect(response.body.table.number).toBe(5);
        });

        it('should list all menu items', async () => {
            const response = await request(app)
                .get(`/api/menu/${restaurantId}`)
                .expect(200);

            expect(response.body).toHaveProperty('items');
            expect(response.body.items.length).toBeGreaterThan(0);
        });

        it('should filter menu items by category', async () => {
            const response = await request(app)
                .get(`/api/menu/${restaurantId}`)
                .query({ category: categoryId.toString() })
                .expect(200);

            expect(response.body.items.length).toBeGreaterThan(0);
            response.body.items.forEach(item => {
                expect(item.category.toString()).toBe(categoryId.toString());
            });
        });

        it('should filter menu items by availability', async () => {
            const response = await request(app)
                .get(`/api/menu/${restaurantId}`)
                .query({ available: 'true' })
                .expect(200);

            response.body.items.forEach(item => {
                expect(item.available).toBe(true);
            });
        });

        it('should get menu categories', async () => {
            const response = await request(app)
                .get(`/api/menu/${restaurantId}/categories`)
                .expect(200);

            expect(response.body).toHaveProperty('categories');
            expect(Array.isArray(response.body.categories)).toBe(true);
        });
    });

    describe('Shopping Cart and Order Creation', () => {
        it('should create order with single item', async () => {
            const orderData = {
                restaurant: restaurantId.toString(),
                table: tableId.toString(),
                phone: clientPhone,
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
            expect(response.body.order).toHaveProperty('total');
            expect(response.body.order.total).toBeGreaterThan(0);
            orderId = response.body.order.id;
        });

        it('should create order with multiple items', async () => {
            const menuItems = await MenuItem.find({ restaurant: restaurantId }).limit(2);

            const orderData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Multi Item Customer',
                orderType: 'dine-in',
                items: menuItems.map(item => ({
                    item: item._id.toString(),
                    qty: 1
                }))
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData)
                .expect(201);

            expect(response.body.order.total).toBeGreaterThan(0);
        });

        it('should calculate tax and service charge correctly', async () => {
            const orderData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Tax Test Customer',
                orderType: 'dine-in',
                items: [
                    {
                        item: menuItemId.toString(),
                        qty: 1
                    }
                ]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData)
                .expect(201);

            // Verify order total includes subtotal + tax + service charge
            expect(response.body.order.total).toBeGreaterThan(250); // Base price
        });

        it('should reject order with unavailable item', async () => {
            // Create unavailable item
            const unavailableItem = await MenuItem.create({
                restaurant: restaurantId,
                name: 'Unavailable Dish',
                price: 100,
                category: categoryId,
                available: false
            });

            const orderData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Test',
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

    describe('Coupon Application', () => {
        it('should apply valid coupon to order', async () => {
            const orderData = {
                restaurant: restaurantId.toString(),
                phone: clientPhone,
                customerName: 'Coupon Test',
                orderType: 'dine-in',
                couponCode: validCouponCode,
                items: [
                    {
                        item: menuItemId.toString(),
                        qty: 2 // Total 500, meets minimum
                    }
                ]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData)
                .expect(201);

            expect(response.body.order.total).toBeLessThan(500 * 1.27); // Should have discount applied
        });

        it('should validate coupon code', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: validCouponCode,
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 200
                })
                .expect(200);

            expect(response.body).toHaveProperty('valid', true);
            expect(response.body).toHaveProperty('discount');
        });

        it('should reject invalid coupon code', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'INVALID123',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 200
                })
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });

        it('should reject coupon when order below minimum', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: validCouponCode,
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 50 // Below minimum of 100
                })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Order Tracking', () => {
        it('should get order details', async () => {
            const response = await request(app)
                .get(`/api/orders/${orderId}`)
                .expect(200);

            expect(response.body).toHaveProperty('order');
            expect(response.body.order._id).toBe(orderId);
        });

        it('should track order status', async () => {
            const order = await Order.findById(orderId);
            expect(order).toBeTruthy();
            expect(order.status).toBeDefined();
            expect(['pending', 'preparing', 'ready', 'delivered']).toContain(order.status);
        });
    });

    describe('Payment Options', () => {
        it('should support cash payment selection', async () => {
            const orderData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Cash Customer',
                orderType: 'dine-in',
                paymentMethod: 'cash',
                items: [{ item: menuItemId.toString(), qty: 1 }]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData)
                .expect(201);

            expect(response.body.order).toBeTruthy();
        });

        it('should record cash payment', async () => {
            const paymentData = {
                order: orderId,
                amount: 635, // Example total
                method: 'cash'
            };

            const response = await request(app)
                .post('/api/payments/cash')
                .send(paymentData)
                .expect(201);

            expect(response.body).toHaveProperty('message');
            expect(response.body.payment.method).toBe('cash');
        });
    });

    describe('Waiter Call Functionality', () => {
        it('should send waiter call from table', async () => {
            const callData = {
                restaurant: restaurantId.toString(),
                table: tableId.toString(),
                type: 'service',
                message: 'Need water please'
            };

            const response = await request(app)
                .post('/api/waiter-calls')
                .send(callData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Waiter call created successfully');
            expect(response.body.call.status).toBe('pending');
        });

        it('should send urgent waiter call', async () => {
            const callData = {
                restaurant: restaurantId.toString(),
                table: tableId.toString(),
                type: 'urgent',
                message: 'Bill please'
            };

            const response = await request(app)
                .post('/api/waiter-calls')
                .send(callData)
                .expect(201);

            expect(response.body.call.type).toBe('urgent');
        });
    });

    describe('Client Reactions', () => {
        it('should send happy reaction', async () => {
            const reactionData = {
                restaurant: restaurantId.toString(),
                table: tableId.toString(),
                type: 'emotion',
                value: 'happy',
                message: 'Great service!'
            };

            const response = await request(app)
                .post('/api/client-reactions')
                .send(reactionData)
                .expect(201);

            expect(response.body.reaction.value).toBe('happy');
        });

        it('should send waiting reaction', async () => {
            const reactionData = {
                restaurant: restaurantId.toString(),
                table: tableId.toString(),
                type: 'emotion',
                value: 'waiting'
            };

            const response = await request(app)
                .post('/api/client-reactions')
                .send(reactionData)
                .expect(201);

            expect(response.body.reaction.value).toBe('waiting');
        });

        it('should send angry reaction', async () => {
            const reactionData = {
                restaurant: restaurantId.toString(),
                table: tableId.toString(),
                type: 'emotion',
                value: 'angry',
                message: 'Too long wait time'
            };

            const response = await request(app)
                .post('/api/client-reactions')
                .send(reactionData)
                .expect(201);

            expect(response.body.reaction.value).toBe('angry');
        });
    });

    describe('Customer Feedback', () => {
        let feedbackId;

        it('should submit 5-emotion feedback', async () => {
            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: orderId,
                rating: 5,
                comment: 'Excellent food and service!',
                emotion: 'very-happy'
            };

            const response = await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Feedback submitted successfully');
            expect(response.body.feedback.rating).toBe(5);
            feedbackId = response.body.feedback._id;
        });

        it('should submit feedback with different emotions', async () => {
            const emotions = ['very-happy', 'happy', 'neutral', 'sad', 'angry'];

            for (const emotion of emotions) {
                const order = await Order.create({
                    restaurant: restaurantId,
                    phone: randomPhone(),
                    orderType: 'dine-in',
                    items: [{ item: menuItemId, qty: 1, itemPrice: 250, subtotal: 250 }],
                    subtotal: 250,
                    total: 250,
                    status: 'delivered'
                });

                const feedbackData = {
                    restaurant: restaurantId.toString(),
                    order: order._id.toString(),
                    rating: emotion === 'very-happy' ? 5 : emotion === 'happy' ? 4 : 3,
                    emotion: emotion
                };

                await request(app)
                    .post('/api/feedback')
                    .send(feedbackData)
                    .expect(201);
            }
        });
    });

    describe('Delivery and Takeaway Orders', () => {
        it('should create delivery order with address', async () => {
            const deliveryData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Delivery Customer',
                orderType: 'delivery',
                deliveryAddress: {
                    street: 'Av. Julius Nyerere',
                    city: 'Maputo',
                    district: 'Polana',
                    notes: 'Blue gate'
                },
                items: [{ item: menuItemId.toString(), qty: 1 }]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(deliveryData)
                .expect(201);

            expect(response.body.order.total).toBeGreaterThan(250); // Includes delivery fee
        });

        it('should create takeaway order', async () => {
            const takeawayData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Takeaway Customer',
                orderType: 'takeaway',
                items: [{ item: menuItemId.toString(), qty: 2 }]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(takeawayData)
                .expect(201);

            expect(response.body.order).toBeTruthy();
        });
    });
});
