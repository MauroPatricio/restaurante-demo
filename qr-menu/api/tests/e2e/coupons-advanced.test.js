import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone, createTestSubscription, updateRestaurantSubscription } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import Coupon from '../../src/models/Coupon.js';

describe('Coupons Advanced E2E Tests', () => {
    let restaurantId;
    let ownerToken;
    let percentageCouponId;
    let fixedCouponId;

    beforeAll(async () => {
        const ownerData = {
            name: 'Coupon Test Owner',
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
    });

    afterAll(async () => {
        await Coupon.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
    });

    describe('Coupon Creation', () => {
        it('should create percentage discount coupon', async () => {
            const couponData = {
                code: 'PERCENT20',
                discountType: 'percentage',
                discountValue: 20,
                minOrderAmount: 150,
                maxDiscount: 300,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                usageLimit: 100,
                isActive: true
            };

            const response = await request(app)
                .post('/api/coupons')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(couponData)
                .expect(201);

            expect(response.body.message).toBe('Coupon created successfully');
            expect(response.body.coupon.code).toBe(couponData.code);
            expect(response.body.coupon.discountType).toBe('percentage');
            percentageCouponId = response.body.coupon._id;
        });

        it('should create fixed amount discount coupon', async () => {
            const couponData = {
                code: 'FIXED100',
                discountType: 'fixed',
                discountValue: 100,
                minOrderAmount: 200,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                usageLimit: 50
            };

            const response = await request(app)
                .post('/api/coupons')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(couponData)
                .expect(201);

            expect(response.body.coupon.discountType).toBe('fixed');
            fixedCouponId = response.body.coupon._id;
        });

        it('should reject duplicate coupon codes', async () => {
            const couponData = {
                code: 'PERCENT20', // Already exists
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            await request(app)
                .post('/api/coupons')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(couponData)
                .expect(400);
        });

        it('should create first-time user coupon', async () => {
            const couponData = {
                code: 'FIRSTTIME50',
                discountType: 'fixed',
                discountValue: 50,
                minOrderAmount: 100,
                firstTimeOnly: true,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                usageLimit: 1000
            };

            const response = await request(app)
                .post('/api/coupons')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(couponData)
                .expect(201);

            expect(response.body.coupon.firstTimeOnly).toBe(true);
        });
    });

    describe('Coupon Validation', () => {
        it('should validate active coupon with minimum order met', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'PERCENT20',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 300 // Above minimum of 150
                })
                .expect(200);

            expect(response.body.valid).toBe(true);
            expect(response.body.discount).toBeGreaterThan(0);
        });

        it('should reject coupon when order below minimum', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'PERCENT20',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 100 // Below minimum of 150
                })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should reject expired coupon', async () => {
            // Create expired coupon
            const expiredCoupon = await Coupon.create({
                restaurant: restaurantId,
                code: 'EXPIRED',
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                validUntil: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
                isActive: true
            });

            await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'EXPIRED',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 200
                })
                .expect(400);
        });

        it('should reject inactive coupon', async () => {
            // Create inactive coupon
            await Coupon.create({
                restaurant: restaurantId,
                code: 'INACTIVE',
                discountType: 'fixed',
                discountValue: 50,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isActive: false
            });

            await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'INACTIVE',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 200
                })
                .expect(404);
        });
    });

    describe('Coupon Usage Tracking', () => {
        let userPhone;

        beforeAll(() => {
            userPhone = randomPhone();
        });

        it('should track coupon usage', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'PERCENT20',
                    restaurant: restaurantId.toString(),
                    phone: userPhone,
                    orderAmount: 300
                })
                .expect(200);

            expect(response.body.valid).toBe(true);

            // Check usage was tracked
            const coupon = await Coupon.findById(percentageCouponId);
            expect(coupon.usedCount).toBeGreaterThan(0);
        });

        it('should prevent duplicate usage by same user', async () => {
            // Use coupon first time
            await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'FIXED100',
                    restaurant: restaurantId.toString(),
                    phone: userPhone,
                    orderAmount: 300
                })
                .expect(200);

            // Try to use again
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'FIXED100',
                    restaurant: restaurantId.toString(),
                    phone: userPhone,
                    orderAmount: 300
                })
                .expect(400);

            expect(response.body.error).toBeTruthy();
        });

        it('should respect usage limits', async () => {
            // Create coupon with limit of 1
            const limitedCoupon = await Coupon.create({
                restaurant: restaurantId,
                code: 'LIMITED1',
                discountType: 'fixed',
                discountValue: 50,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                usageLimit: 1,
                usedCount: 0,
                isActive: true
            });

            // Use it once
            await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'LIMITED1',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 200
                })
                .expect(200);

            // Update usage
            await Coupon.findByIdAndUpdate(limitedCoupon._id, {
                $inc: { usedCount: 1 }
            });

            // Try with different user - should fail
            await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'LIMITED1',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 200
                })
                .expect(400);
        });
    });

    describe('Coupon Management', () => {
        it('should list all coupons for restaurant', async () => {
            const response = await request(app)
                .get(`/api/coupons/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('coupons');
            expect(response.body.coupons.length).toBeGreaterThan(0);
        });

        it('should update coupon details', async () => {
            const updates = {
                discountValue: 25,
                minOrderAmount: 200
            };

            const response = await request(app)
                .patch(`/api/coupons/${percentageCouponId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.coupon.discountValue).toBe(25);
            expect(response.body.coupon.minOrderAmount).toBe(200);
        });

        it('should deactivate coupon', async () => {
            const response = await request(app)
                .delete(`/api/coupons/${fixedCouponId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body.message).toBe('Coupon deactivated successfully');

            // Verify coupon is inactive
            const coupon = await Coupon.findById(fixedCouponId);
            expect(coupon.isActive).toBe(false);
        });
    });

    describe('Discount Calculation', () => {
        it('should calculate percentage discount correctly', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'PERCENT20',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 500
                })
                .expect(200);

            // 20% of 500 = 100
            expect(response.body.discount).toBe(100);
        });

        it('should cap percentage discount at maxDiscount', async () => {
            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'PERCENT20', // Has maxDiscount of 300
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 2000 // 20% would be 400
                })
                .expect(200);

            // Should be capped at 300
            expect(response.body.discount).toBe(300);
        });

        it('should calculate fixed discount correctly', async () => {
            // Create new fixed coupon for this test
            const coupon = await Coupon.create({
                restaurant: restaurantId,
                code: 'FIXED75',
                discountType: 'fixed',
                discountValue: 75,
                minOrderAmount: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isActive: true
            });

            const response = await request(app)
                .post('/api/coupons/validate')
                .send({
                    code: 'FIXED75',
                    restaurant: restaurantId.toString(),
                    phone: randomPhone(),
                    orderAmount: 300
                })
                .expect(200);

            expect(response.body.discount).toBe(75);
        });
    });
});
