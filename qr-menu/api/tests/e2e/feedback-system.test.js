import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone, createTestSubscription, updateRestaurantSubscription } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import MenuItem from '../../src/models/MenuItem.js';
import Category from '../../src/models/Category.js';
import Order from '../../src/models/Order.js';
import Feedback from '../../src/models/Feedback.js';

describe('Feedback System E2E Tests', () => {
    let restaurantId;
    let ownerToken;
    let orderId;
    let menuItemId;

    beforeAll(async () => {
        const ownerData = {
            name: 'Feedback Test Owner',
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

        // Create menu item and order
        const category = await Category.create({
            restaurant: restaurantId,
            name: 'Feedback Test Category',
            displayOrder: 1
        });

        const menuItem = await MenuItem.create({
            restaurant: restaurantId,
            name: 'Feedback Test Item',
            price: 200,
            category: category._id,
            available: true
        });
        menuItemId = menuItem._id;

        const order = await Order.create({
            restaurant: restaurantId,
            phone: randomPhone(),
            orderType: 'dine-in',
            items: [{ item: menuItemId, qty: 1, itemPrice: 200, subtotal: 200 }],
            subtotal: 200,
            total: 200,
            status: 'delivered'
        });
        orderId = order._id;
    });

    afterAll(async () => {
        await Feedback.deleteMany({ restaurant: restaurantId });
        await Order.deleteMany({ restaurant: restaurantId });
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('Submit Feedback', () => {
        it('should submit 5-star feedback with very-happy emotion', async () => {
            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: orderId.toString(),
                rating: 5,
                emotion: 'very-happy',
                comment: 'Absolutely amazing food and service!',
                foodQuality: 5,
                serviceQuality: 5,
                ambiance: 5
            };

            const response = await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(201);

            expect(response.body.message).toBe('Feedback submitted successfully');
            expect(response.body.feedback.rating).toBe(5);
            expect(response.body.feedback.emotion).toBe('very-happy');
        });

        it('should submit 4-star feedback with happy emotion', async () => {
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'dine-in',
                items: [{ item: menuItemId, qty: 1, itemPrice: 200, subtotal: 200 }],
                subtotal: 200,
                total: 200,
                status: 'delivered'
            });

            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: order._id.toString(),
                rating: 4,
                emotion: 'happy',
                comment: 'Very good experience',
                foodQuality: 4,
                serviceQuality: 4
            };

            const response = await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(201);

            expect(response.body.feedback.rating).toBe(4);
            expect(response.body.feedback.emotion).toBe('happy');
        });

        it('should submit 3-star feedback with neutral emotion', async () => {
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'dine-in',
                items: [{ item: menuItemId, qty: 1, itemPrice: 200, subtotal: 200 }],
                subtotal: 200,
                total: 200,
                status: 'delivered'
            });

            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: order._id.toString(),
                rating: 3,
                emotion: 'neutral',
                comment: 'Average experience',
                foodQuality: 3,
                serviceQuality: 3
            };

            await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(201);
        });

        it('should submit 2-star feedback with sad emotion', async () => {
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'dine-in',
                items: [{ item: menuItemId, qty: 1, itemPrice: 200, subtotal: 200 }],
                subtotal: 200,
                total: 200,
                status: 'delivered'
            });

            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: order._id.toString(),
                rating: 2,
                emotion: 'sad',
                comment: 'Not very satisfied',
                foodQuality: 2,
                serviceQuality: 3
            };

            await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(201);
        });

        it('should submit 1-star feedback with angry emotion', async () => {
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'dine-in',
                items: [{ item: menuItemId, qty: 1, itemPrice: 200, subtotal: 200 }],
                subtotal: 200,
                total: 200,
                status: 'delivered'
            });

            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: order._id.toString(),
                rating: 1,
                emotion: 'angry',
                comment: 'Very poor service and cold food',
                foodQuality: 1,
                serviceQuality: 1
            };

            const response = await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(201);

            expect(response.body.feedback.rating).toBe(1);
            expect(response.body.feedback.emotion).toBe('angry');
        });

        it('should submit feedback without comment', async () => {
            const order = await Order.create({
                restaurant: restaurantId,
                phone: randomPhone(),
                orderType: 'dine-in',
                items: [{ item: menuItemId, qty: 1, itemPrice: 200, subtotal: 200 }],
                subtotal: 200,
                total: 200,
                status: 'delivered'
            });

            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: order._id.toString(),
                rating: 5,
                emotion: 'very-happy'
            };

            const response = await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(201);

            expect(response.body.feedback.rating).toBe(5);
        });
    });

    describe('View Feedback', () => {
        it('should get all feedback for restaurant', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('feedback');
            expect(Array.isArray(response.body.feedback)).toBe(true);
            expect(response.body.feedback.length).toBeGreaterThan(0);
        });

        it('should filter feedback by rating', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .query({ rating: 5 })
                .expect(200);

            response.body.feedback.forEach(fb => {
                expect(fb.rating).toBe(5);
            });
        });

        it('should filter feedback by emotion', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .query({ emotion: 'very-happy' })
                .expect(200);

            response.body.feedback.forEach(fb => {
                expect(fb.emotion).toBe('very-happy');
            });
        });

        it('should filter feedback by date range', async () => {
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
            const endDate = new Date();

            const response = await request(app)
                .get(`/api/feedback/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .query({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                })
                .expect(200);

            expect(response.body.feedback).toBeTruthy();
        });
    });

    describe('Feedback Statistics', () => {
        it('should get feedback statistics', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}/stats`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('stats');
            expect(response.body.stats).toHaveProperty('totalFeedback');
            expect(response.body.stats).toHaveProperty('averageRating');
            expect(response.body.stats).toHaveProperty('emotionBreakdown');
        });

        it('should calculate average rating correctly', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}/stats`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            const avgRating = response.body.stats.averageRating;
            expect(avgRating).toBeGreaterThan(0);
            expect(avgRating).toBeLessThanOrEqual(5);
        });

        it('should provide emotion breakdown', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}/stats`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            const breakdown = response.body.stats.emotionBreakdown;
            expect(breakdown).toHaveProperty('very-happy');
            expect(breakdown).toHaveProperty('happy');
            expect(breakdown).toHaveProperty('neutral');
            expect(breakdown).toHaveProperty('sad');
            expect(breakdown).toHaveProperty('angry');
        });

        it('should provide rating distribution', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}/stats`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body.stats).toHaveProperty('ratingDistribution');
            const distribution = response.body.stats.ratingDistribution;
            expect(distribution).toBeTruthy();
        });
    });

    describe('Feedback Analytics', () => {
        it('should get feedback trends over time', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}/trends`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .query({
                    period: 'week'
                })
                .expect(200);

            expect(response.body).toHaveProperty('trends');
        });

        it('should identify improvement areas', async () => {
            const response = await request(app)
                .get(`/api/feedback/${restaurantId}/stats`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            // Check if there are low ratings that need attention
            const stats = response.body.stats;
            if (stats.emotionBreakdown.angry > 0 || stats.emotionBreakdown.sad > 0) {
                expect(stats.totalFeedback).toBeGreaterThan(0);
            }
        });
    });

    describe('Feedback Validation', () => {
        it('should reject feedback without restaurant ID', async () => {
            const feedbackData = {
                order: orderId.toString(),
                rating: 5,
                emotion: 'very-happy'
            };

            await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(400);
        });

        it('should reject feedback with invalid rating', async () => {
            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: orderId.toString(),
                rating: 6, // Invalid: should be 1-5
                emotion: 'very-happy'
            };

            await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(400);
        });

        it('should reject feedback with invalid emotion', async () => {
            const feedbackData = {
                restaurant: restaurantId.toString(),
                order: orderId.toString(),
                rating: 5,
                emotion: 'invalid-emotion'
            };

            await request(app)
                .post('/api/feedback')
                .send(feedbackData)
                .expect(400);
        });
    });
});
