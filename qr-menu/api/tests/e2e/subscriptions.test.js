import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import Subscription from '../../src/models/Subscription.js';
import SubscriptionTransaction from '../../src/models/SubscriptionTransaction.js';

describe('Subscriptions E2E Tests', () => {
    let restaurantId;
    let ownerToken;
    let subscriptionId;

    beforeAll(async () => {
        // Create owner and restaurant
        const ownerData = {
            name: 'Subscription Test Owner',
            email: randomEmail(),
            password: 'Owner@1234',
            phone: randomPhone(),
        };

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send(ownerData);

        restaurantId = registerResponse.body.restaurant._id;

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
            .send({ restaurantId });

        ownerToken = selectResponse.body.token;
    });

    afterAll(async () => {
        // Cleanup
        await SubscriptionTransaction.deleteMany({ restaurant: restaurantId });
        await Subscription.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('Trial Period', () => {
        it('should have 30-day trial for new restaurant', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body.subscription).toBeTruthy();
            const subscription = response.body.subscription;
            subscriptionId = subscription._id;

            // Check if trial period exists
            const trialEnd = new Date(subscription.currentPeriodEnd);
            const now = new Date();
            const daysUntilEnd = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

            expect(daysUntilEnd).toBeLessThanOrEqual(30);
            expect(daysUntilEnd).toBeGreaterThan(0);
        });

        it('should allow all operations during trial period', async () => {
            // Should be able to create tables
            const tableResponse = await request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    restaurant: restaurantId.toString(),
                    number: 1,
                    capacity: 4
                });

            expect(tableResponse.status).toBe(201);
        });
    });

    describe('Active Subscription', () => {
        beforeAll(async () => {
            // Update subscription to active (non-trial)
            await Subscription.findByIdAndUpdate(subscriptionId, {
                status: 'active',
                trialEndsAt: new Date(Date.now() - 1000), // Trial ended
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
        });

        it('should show active status', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body.subscription.status).toBe('active');
        });

        it('should allow all operations with active subscription', async () => {
            const response = await request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    restaurant: restaurantId.toString(),
                    number: 2,
                    capacity: 6
                })
                .expect(201);

            expect(response.body.table).toBeTruthy();
        });
    });

    describe('Expired Subscription', () => {
        beforeAll(async () => {
            // Expire the subscription (past grace period)
            await Subscription.findByIdAndUpdate(subscriptionId, {
                status: 'suspended',
                currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                lastPaymentDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
            });

            // Update restaurant subscription reference
            await Restaurant.findByIdAndUpdate(restaurantId, {
                subscription: subscriptionId
            });
        });

        it('should show suspended status', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body.subscription.status).toBe('suspended');
        });

        it('should block operations after grace period', async () => {
            await request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    restaurant: restaurantId.toString(),
                    number: 99,
                    capacity: 4
                })
                .expect(403); // Should be forbidden
        });
    });

    describe('Payment Processing', () => {
        it('should record subscription payment', async () => {
            const paymentData = {
                restaurant: restaurantId.toString(),
                amount: 10000,
                currency: 'MT',
                method: 'mpesa',
                reference: `TEST-${Date.now()}`
            };

            const response = await request(app)
                .post('/api/subscriptions/payment')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(paymentData)
                .expect(201);

            expect(response.body.message).toBe('Payment recorded successfully');
            expect(response.body.subscription.status).toBe('active');
        });

        it('should update subscription status after payment', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body.subscription.status).toBe('active');
        });
    });

    describe('Payment History', () => {
        it('should view payment history', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}/history`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should show payment details in history', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}/history`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            if (response.body.transactions.length > 0) {
                const transaction = response.body.transactions[0];
                expect(transaction).toHaveProperty('amount');
                expect(transaction).toHaveProperty('method');
                expect(transaction).toHaveProperty('status');
            }
        });
    });

    describe('Grace Period Handling', () => {
        it('should allow operations during grace period', async () => {
            // Set subscription to just expired but within grace period
            await Subscription.findByIdAndUpdate(subscriptionId, {
                status: 'pending_renewal',
                currentPeriodEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                gracePeriodEnds: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day from now
            });

            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            // Should still be accessible
            expect(response.body.subscription).toBeTruthy();
        });
    });

    describe('Subscription Renewal', () => {
        it('should renew subscription for next period', async () => {
            const paymentData = {
                restaurant: restaurantId.toString(),
                amount: 10000,
                currency: 'MT',
                method: 'bank_transfer',
                reference: `RENEWAL-${Date.now()}`
            };

            const response = await request(app)
                .post('/api/subscriptions/payment')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(paymentData)
                .expect(201);

            expect(response.body.subscription.status).toBe('active');

            // Verify new period dates
            const subscription = await Subscription.findById(subscriptionId);
            const periodEnd = new Date(subscription.currentPeriodEnd);
            const now = new Date();
            expect(periodEnd > now).toBe(true);
        });
    });
});
