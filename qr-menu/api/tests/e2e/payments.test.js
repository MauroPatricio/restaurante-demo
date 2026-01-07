import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone, createTestSubscription, updateRestaurantSubscription } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import MenuItem from '../../src/models/MenuItem.js';
import Category from '../../src/models/Category.js';
import Order from '../../src/models/Order.js';
import Payment from '../../src/models/Payment.js';

describe('Payments E2E Tests', () => {
    let restaurantId;
    let ownerToken;
    let orderId;
    let orderTotal;
    let menuItemId;

    beforeAll(async () => {
        // Setup restaurant and owner
        const ownerData = {
            name: 'Payment Test Owner',
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

        // Create menu item
        const category = await Category.create({
            restaurant: restaurantId,
            name: 'Test Category',
            displayOrder: 1
        });

        const menuItem = await MenuItem.create({
            restaurant: restaurantId,
            name: 'Test Item',
            price: 200,
            category: category._id,
            available: true
        });
        menuItemId = menuItem._id;

        // Create a test order
        const orderResponse = await request(app)
            .post('/api/orders')
            .send({
                restaurant: restaurantId.toString(),
                phone: randomPhone(),
                customerName: 'Payment Test',
                items: [
                    {
                        item: menuItemId.toString(),
                        qty: 2
                    }
                ]
            })
            .expect(201);

        orderId = orderResponse.body.order.id;
        orderTotal = orderResponse.body.order.total;
    });

    afterAll(async () => {
        await Payment.deleteMany({ restaurant: restaurantId });
        await Order.deleteMany({ restaurant: restaurantId });
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('Cash Payments', () => {
        it('should record cash payment successfully', async () => {
            const paymentData = {
                order: orderId,
                amount: orderTotal,
                method: 'cash'
            };

            const response = await request(app)
                .post('/api/payments/cash')
                .send(paymentData)
                .expect(201);

            expect(response.body).toHaveProperty('message');
            expect(response.body.payment.method).toBe('cash');
            expect(response.body.payment.status).toBe('completed');
            expect(response.body.payment.amount).toBe(orderTotal);
        });

        it('should fail cash payment without order ID', async () => {
            const paymentData = {
                amount: 100,
                method: 'cash'
            };

            await request(app)
                .post('/api/payments/cash')
                .send(paymentData)
                .expect(400);
        });
    });

    describe('Bank Transfer Payments', () => {
        it('should upload bank receipt and create payment', async () => {
            const paymentData = {
                order: orderId,
                amount: orderTotal,
                method: 'bank_transfer',
                transactionId: `BANK-${Date.now()}`
            };

            const response = await request(app)
                .post('/api/payments/bank')
                .send(paymentData)
                .expect(201);

            expect(response.body.payment.method).toBe('bank_transfer');
            expect(response.body.payment.status).toBe('pending'); // Pending verification
        });

        it('should verify bank payment', async () => {
            // Create pending bank payment
            const paymentData = {
                order: orderId,
                amount: orderTotal,
                method: 'bank_transfer',
                transactionId: `BANK-VERIFY-${Date.now()}`
            };

            const createResponse = await request(app)
                .post('/api/payments/bank')
                .send(paymentData);

            const paymentId = createResponse.body.payment._id;

            // Owner verifies payment
            const verifyResponse = await request(app)
                .patch(`/api/payments/${paymentId}/verify`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ verified: true })
                .expect(200);

            expect(verifyResponse.body.payment.status).toBe('completed');
        });
    });

    describe('Mpesa Payments', () => {
        it('should initiate Mpesa payment', async () => {
            const paymentData = {
                order: orderId,
                amount: orderTotal,
                phone: randomPhone()
            };

            const response = await request(app)
                .post('/api/payments/mpesa')
                .send(paymentData)
                .expect(201);

            expect(response.body).toHaveProperty('message');
            expect(response.body.payment).toBeTruthy();
            expect(response.body.payment.method).toBe('mpesa');
            expect(response.body.payment.status).toBe('pending');
        });

        it('should handle Mpesa callback', async () => {
            // Create pending Mpesa payment
            const payment = await Payment.create({
                restaurant: restaurantId,
                order: orderId,
                amount: orderTotal,
                method: 'mpesa',
                status: 'pending',
                transactionId: `MPESA-${Date.now()}`
            });

            const callbackData = {
                transactionId: payment.transactionId,
                status: 'success',
                amount: orderTotal
            };

            const response = await request(app)
                .post('/api/payments/webhook')
                .send(callbackData)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify payment status updated
            const updatedPayment = await Payment.findById(payment._id);
            expect(updatedPayment.status).toBe('completed');
        });

        it('should handle failed Mpesa payment', async () => {
            const payment = await Payment.create({
                restaurant: restaurantId,
                order: orderId,
                amount: orderTotal,
                method: 'mpesa',
                status: 'pending',
                transactionId: `MPESA-FAIL-${Date.now()}`
            });

            const callbackData = {
                transactionId: payment.transactionId,
                status: 'failed',
                errorMessage: 'Insufficient funds'
            };

            await request(app)
                .post('/api/payments/webhook')
                .send(callbackData)
                .expect(200);

            const updatedPayment = await Payment.findById(payment._id);
            expect(updatedPayment.status).toBe('failed');
        });
    });

    describe('eMola Payments', () => {
        it('should initiate eMola payment', async () => {
            const paymentData = {
                order: orderId,
                amount: orderTotal,
                phone: randomPhone()
            };

            const response = await request(app)
                .post('/api/payments/emola')
                .send(paymentData)
                .expect(201);

            expect(response.body.payment.method).toBe('emola');
            expect(response.body.payment.status).toBe('pending');
        });

        it('should handle eMola webhook', async () => {
            const payment = await Payment.create({
                restaurant: restaurantId,
                order: orderId,
                amount: orderTotal,
                method: 'emola',
                status: 'pending',
                transactionId: `EMOLA-${Date.now()}`
            });

            const webhookData = {
                transactionId: payment.transactionId,
                status: 'completed',
                amount: orderTotal
            };

            await request(app)
                .post('/api/payments/webhook')
                .send(webhookData)
                .expect(200);

            const updatedPayment = await Payment.findById(payment._id);
            expect(updatedPayment.status).toBe('completed');
        });
    });

    describe('Payment Status Tracking', () => {
        let paymentReference;

        beforeAll(async () => {
            const payment = await Payment.create({
                restaurant: restaurantId,
                order: orderId,
                amount: orderTotal,
                method: 'mpesa',
                status: 'completed',
                transactionId: `REF-${Date.now()}`
            });
            paymentReference = payment.transactionId;
        });

        it('should get payment status by reference', async () => {
            const response = await request(app)
                .get(`/api/payments/${paymentReference}`)
                .expect(200);

            expect(response.body).toHaveProperty('payment');
            expect(response.body.payment.transactionId).toBe(paymentReference);
            expect(response.body.payment.status).toBe('completed');
        });

        it('should return 404 for non-existent payment', async () => {
            await request(app)
                .get('/api/payments/NON-EXISTENT-REF')
                .expect(404);
        });
    });

    describe('Payment Validation', () => {
        it('should reject payment with invalid amount', async () => {
            const paymentData = {
                order: orderId,
                amount: -100, // Invalid negative amount
                method: 'cash'
            };

            await request(app)
                .post('/api/payments/cash')
                .send(paymentData)
                .expect(400);
        });

        it('should reject payment with missing required fields', async () => {
            const paymentData = {
                amount: 100 // Missing order
            };

            await request(app)
                .post('/api/payments/cash')
                .send(paymentData)
                .expect(400);
        });
    });
});
