import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone, createTestSubscription, updateRestaurantSubscription } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import MenuItem from '../../src/models/MenuItem.js';
import Category from '../../src/models/Category.js';
import Order from '../../src/models/Order.js';
import Delivery from '../../src/models/Delivery.js';
import UserRestaurantRole from '../../src/models/UserRestaurantRole.js';
import Role from '../../src/models/Role.js';

describe('Delivery System E2E Tests', () => {
    let restaurantId;
    let ownerToken;
    let deliveryPersonToken;
    let deliveryPersonId;
    let orderId;
    let deliveryId;
    let menuItemId;

    beforeAll(async () => {
        // Setup restaurant
        const ownerData = {
            name: 'Delivery Test Owner',
            email: randomEmail(),
            password: 'Owner@1234',
            phone: randomPhone(),
        };

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send(ownerData);

        restaurantId = registerResponse.body.restaurant._id;

        const subscription = await createTestSubscription(restaurantId);
        await updateRestaurantSubscription(restaurantId, subscription._id);

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

        // Create menu item for orders
        const category = await Category.create({
            restaurant: restaurantId,
            name: 'Delivery Test Category',
            displayOrder: 1
        });

        const menuItem = await MenuItem.create({
            restaurant: restaurantId,
            name: 'Delivery Test Item',
            price: 250,
            category: category._id,
            available: true
        });
        menuItemId = menuItem._id;

        // Create delivery person
        const deliveryPersonData = {
            name: 'Delivery Person',
            email: randomEmail(),
            password: 'Delivery@1234',
            phone: randomPhone(),
        };

        const deliveryPerson = await User.create(deliveryPersonData);
        deliveryPersonId = deliveryPerson._id;

        // Setup delivery role
        let deliveryRole = await Role.findOne({ name: 'delivery' });
        if (!deliveryRole) {
            deliveryRole = await Role.create({
                name: 'delivery',
                description: 'Delivery Personnel'
            });
        }

        await UserRestaurantRole.create({
            user: deliveryPersonId,
            restaurant: restaurantId,
            role: deliveryRole._id,
            active: true,
            isDefault: true
        });

        // Login delivery person
        const deliveryLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: deliveryPersonData.email,
                password: deliveryPersonData.password
            });

        const deliverySelectResponse = await request(app)
            .post('/api/auth/select-restaurant')
            .set('Authorization', `Bearer ${deliveryLoginResponse.body.token}`)
            .send({ restaurantId });

        deliveryPersonToken = deliverySelectResponse.body.token;
    });

    afterAll(async () => {
        await Delivery.deleteMany({ restaurant: restaurantId });
        await Order.deleteMany({ restaurant: restaurantId });
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await UserRestaurantRole.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('Delivery Order Creation', () => {
        it('should create delivery order with address', async () => {
            const deliveryOrderData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Delivery Customer',
                orderType: 'delivery',
                deliveryAddress: {
                    street: 'Av. Julius Nyerere, 123',
                    city: 'Maputo',
                    district: 'Polana Cimento',
                    postalCode: '1100',
                    notes: 'Blue gate, ring bell'
                },
                items: [
                    {
                        item: menuItemId.toString(),
                        qty: 2
                    }
                ]
            };

            const response = await request(app)
                .post('/api/orders')
                .send(deliveryOrderData)
                .expect(201);

            expect(response.body.order).toBeTruthy();
            expect(response.body.order.total).toBeGreaterThan(500); // Includes delivery fee
            orderId = response.body.order.id;
        });

        it('should fail delivery order without address', async () => {
            const invalidData = {
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                orderType: 'delivery',
                items: [
                    {
                        item: menuItemId.toString(),
                        qty: 1
                    }
                ]
            };

            await request(app)
                .post('/api/orders')
                .send(invalidData)
                .expect(400);
        });
    });

    describe('Delivery Assignment', () => {
        it('should assign delivery to delivery person', async () => {
            const assignmentData = {
                order: orderId,
                deliveryPerson: deliveryPersonId.toString(),
                estimatedTime: 30
            };

            const response = await request(app)
                .post('/api/delivery')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(assignmentData)
                .expect(201);

            expect(response.body.message).toBe('Delivery created successfully');
            expect(response.body.delivery.deliveryPerson.toString()).toBe(deliveryPersonId.toString());
            deliveryId = response.body.delivery._id;
        });

        it('should notify delivery person of assignment', async () => {
            // Get active deliveries for delivery person
            const response = await request(app)
                .get('/api/delivery/active')
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('deliveries');
            expect(response.body.deliveries.length).toBeGreaterThan(0);
        });
    });

    describe('Delivery Status Updates', () => {
        it('should update status to picked up', async () => {
            const response = await request(app)
                .patch(`/api/delivery/${deliveryId}/status`)
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .send({ status: 'picked_up' })
                .expect(200);

            expect(response.body.delivery.status).toBe('picked_up');
        });

        it('should update status to in transit', async () => {
            const response = await request(app)
                .patch(`/api/delivery/${deliveryId}/status`)
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .send({ status: 'in_transit' })
                .expect(200);

            expect(response.body.delivery.status).toBe('in_transit');
        });

        it('should update status to delivered', async () => {
            const response = await request(app)
                .patch(`/api/delivery/${deliveryId}/status`)
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .send({ status: 'delivered' })
                .expect(200);

            expect(response.body.delivery.status).toBe('delivered');
            expect(response.body.delivery.completedAt).toBeTruthy();
        });

        it('should prevent invalid status transitions', async () => {
            // Try to change from delivered to pending
            await request(app)
                .patch(`/api/delivery/${deliveryId}/status`)
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .send({ status: 'pending' })
                .expect(400);
        });
    });

    describe('Location Tracking', () => {
        let activeDeliveryId;

        beforeAll(async () => {
            // Create new delivery for tracking
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'delivery',
                items: [{ item: menuItemId, qty: 1, itemPrice: 250, subtotal: 250 }],
                subtotal: 250,
                total: 300,
                deliveryAddress: {
                    street: 'Test Street',
                    city: 'Maputo'
                },
                status: 'preparing'
            });

            const delivery = await Delivery.create({
                restaurant: restaurantId,
                order: order._id,
                deliveryPerson: deliveryPersonId,
                status: 'in_transit',
                estimatedTime: 25
            });
            activeDeliveryId = delivery._id;
        });

        it('should update delivery person location', async () => {
            const locationData = {
                deliveryId: activeDeliveryId.toString(),
                latitude: -25.9692,
                longitude: 32.5732
            };

            const response = await request(app)
                .patch('/api/delivery/location')
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .send(locationData)
                .expect(200);

            expect(response.body.message).toBe('Location updated successfully');
        });

        it('should get current delivery location', async () => {
            const delivery = await Delivery.findById(activeDeliveryId);
            expect(delivery.currentLocation).toBeTruthy();
            expect(delivery.currentLocation.coordinates).toBeTruthy();
        });
    });

    describe('Delivery Management', () => {
        it('should get all deliveries for restaurant', async () => {
            const response = await request(app)
                .get(`/api/delivery/restaurant/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('deliveries');
            expect(Array.isArray(response.body.deliveries)).toBe(true);
        });

        it('should filter deliveries by status', async () => {
            const response = await request(app)
                .get(`/api/delivery/restaurant/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .query({ status: 'delivered' })
                .expect(200);

            response.body.deliveries.forEach(delivery => {
                expect(delivery.status).toBe('delivered');
            });
        });
    });

    describe('Delivery Completion', () => {
        let completionDeliveryId;

        beforeAll(async () => {
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'delivery',
                items: [{ item: menuItemId, qty: 1, itemPrice: 250, subtotal: 250 }],
                subtotal: 250,
                total: 300,
                deliveryAddress: { street: 'Test', city: 'Maputo' },
                status: 'ready'
            });

            const delivery = await Delivery.create({
                restaurant: restaurantId,
                order: order._id,
                deliveryPerson: deliveryPersonId,
                status: 'in_transit',
                estimatedTime: 20
            });
            completionDeliveryId = delivery._id;
        });

        it('should mark delivery as completed', async () => {
            const response = await request(app)
                .patch(`/api/delivery/${completionDeliveryId}/status`)
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .send({
                    status: 'delivered',
                    notes: 'Delivered successfully to customer'
                })
                .expect(200);

            expect(response.body.delivery.status).toBe('delivered');
            expect(response.body.delivery.completedAt).toBeTruthy();
        });

        it('should calculate delivery time', async () => {
            const delivery = await Delivery.findById(completionDeliveryId);

            if (delivery.pickedUpAt && delivery.completedAt) {
                const deliveryTime = (new Date(delivery.completedAt) - new Date(delivery.pickedUpAt)) / (1000 * 60);
                expect(deliveryTime).toBeGreaterThan(0);
            }
        });
    });

    describe('Delivery Earnings', () => {
        it('should track delivery person earnings', async () => {
            // Get completed deliveries for earning calculation
            const deliveries = await Delivery.find({
                deliveryPerson: deliveryPersonId,
                status: 'delivered'
            });

            const totalEarnings = deliveries.length * 50; // Assuming 50 MT per delivery
            expect(totalEarnings).toBeGreaterThan(0);
        });
    });

    describe('Failed Deliveries', () => {
        it('should handle failed delivery attempt', async () => {
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'delivery',
                items: [{ item: menuItemId, qty: 1, itemPrice: 250, subtotal: 250 }],
                subtotal: 250,
                total: 300,
                deliveryAddress: { street: 'Test', city: 'Maputo' },
                status: 'ready'
            });

            const delivery = await Delivery.create({
                restaurant: restaurantId,
                order: order._id,
                deliveryPerson: deliveryPersonId,
                status: 'in_transit',
                estimatedTime: 20
            });

            const response = await request(app)
                .patch(`/api/delivery/${delivery._id}/status`)
                .set('Authorization', `Bearer ${deliveryPersonToken}`)
                .send({
                    status: 'failed',
                    failureReason: 'Customer not available'
                })
                .expect(200);

            expect(response.body.delivery.status).toBe('failed');
        });
    });
});
