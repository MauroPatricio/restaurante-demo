import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone, createTestSubscription, updateRestaurantSubscription } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import Table from '../../src/models/Table.js';
import MenuItem from '../../src/models/MenuItem.js';
import Category from '../../src/models/Category.js';
import Subcategory from '../../src/models/Subcategory.js';
import UserRestaurantRole from '../../src/models/UserRestaurantRole.js';
import Role from '../../src/models/Role.js';
import Coupon from '../../src/models/Coupon.js';
import WaiterCall from '../../src/models/WaiterCall.js';

describe('Owner Workflows E2E Tests', () => {
    let ownerToken;
    let restaurantId;
    let ownerId;
    let categoryId;
    let subcategoryId;
    let menuItemId;
    let tableId;

    beforeAll(async () => {
        // Setup: Create owner account
        const ownerData = {
            name: 'Restaurant Owner',
            email: randomEmail(),
            password: 'Owner@1234',
            phone: randomPhone(),
        };

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send(ownerData);

        ownerId = registerResponse.body.user._id;
        restaurantId = registerResponse.body.restaurant._id;

        // Create subscription for restaurant
        const subscription = await createTestSubscription(restaurantId);
        await updateRestaurantSubscription(restaurantId, subscription._id);

        // Create role association
        let ownerRole = await Role.findOne({ name: 'owner' });
        if (!ownerRole) {
            ownerRole = await Role.create({ name: 'owner', description: 'Restaurant Owner' });
        }

        await UserRestaurantRole.create({
            user: ownerId,
            restaurant: restaurantId,
            role: ownerRole._id,
            active: true,
            isDefault: true
        });

        // Login and select restaurant
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
        // Cleanup all test data
        await WaiterCall.deleteMany({ restaurant: restaurantId });
        await Coupon.deleteMany({ restaurant: restaurantId });
        await MenuItem.deleteMany({ restaurant: restaurantId });
        await Subcategory.deleteMany({ restaurant: restaurantId });
        await Category.deleteMany({ restaurant: restaurantId });
        await Table.deleteMany({ restaurant: restaurantId });
        await UserRestaurantRole.deleteMany({ restaurant: restaurantId });
        await Restaurant.deleteOne({ _id: restaurantId });
        await User.deleteOne({ _id: ownerId });
    });

    describe('Restaurant Management', () => {
        it('should view restaurant details', async () => {
            const response = await request(app)
                .get(`/api/restaurants/${restaurantId}`)
                .expect(200);

            expect(response.body).toHaveProperty('restaurant');
            expect(response.body.restaurant._id).toBe(restaurantId.toString());
        });

        it('should update restaurant settings', async () => {
            const updates = {
                name: 'Updated Restaurant Name',
                description: 'A great place to eat',
                settings: {
                    taxRate: 17,
                    serviceChargeRate: 10
                }
            };

            const response = await request(app)
                .patch(`/api/restaurants/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.message).toBe('Restaurant updated successfully');
            expect(response.body.restaurant.name).toBe(updates.name);
        });
    });

    describe('Menu Management - Categories', () => {
        it('should create a category', async () => {
            const categoryData = {
                name: 'Appetizers',
                description: 'Start your meal right',
                displayOrder: 1,
                isActive: true
            };

            const response = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(categoryData)
                .expect(201);

            expect(response.body.message).toBe('Category created successfully');
            expect(response.body.category.name).toBe(categoryData.name);
            categoryId = response.body.category._id;
        });

        it('should list all categories for restaurant', async () => {
            const response = await request(app)
                .get(`/api/categories/restaurant/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('categories');
            expect(Array.isArray(response.body.categories)).toBe(true);
            expect(response.body.categories.length).toBeGreaterThan(0);
        });

        it('should update a category', async () => {
            const updates = {
                name: 'Updated Appetizers',
                displayOrder: 2
            };

            const response = await request(app)
                .patch(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.category.name).toBe(updates.name);
        });
    });

    describe('Menu Management - Subcategories', () => {
        it('should create a subcategory', async () => {
            const subcategoryData = {
                name: 'Salads',
                category: categoryId,
                description: 'Fresh salads',
                displayOrder: 1
            };

            const response = await request(app)
                .post('/api/subcategories')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(subcategoryData)
                .expect(201);

            expect(response.body.message).toBe('Subcategory created successfully');
            subcategoryId = response.body.subcategory._id;
        });

        it('should list subcategories for a category', async () => {
            const response = await request(app)
                .get(`/api/subcategories/category/${categoryId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('subcategories');
            expect(response.body.subcategories.length).toBeGreaterThan(0);
        });
    });

    describe('Menu Management - Items', () => {
        it('should create a menu item', async () => {
            const menuItemData = {
                name: 'Caesar Salad',
                description: 'Classic Caesar salad with romaine lettuce',
                price: 150,
                category: categoryId,
                subcategory: subcategoryId,
                available: true,
                prepTime: 10,
                allergens: ['dairy', 'eggs']
            };

            const response = await request(app)
                .post('/api/menu-items')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(menuItemData)
                .expect(201);

            expect(response.body.message).toBe('Menu item created successfully');
            expect(response.body.menuItem.name).toBe(menuItemData.name);
            menuItemId = response.body.menuItem._id;
        });

        it('should get menu items for restaurant', async () => {
            const response = await request(app)
                .get(`/api/menu/${restaurantId}`)
                .expect(200);

            expect(response.body).toHaveProperty('items');
            expect(response.body.items.length).toBeGreaterThan(0);
        });

        it('should update menu item availability', async () => {
            const response = await request(app)
                .patch(`/api/menu-items/${menuItemId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ available: false })
                .expect(200);

            expect(response.body.menuItem.available).toBe(false);
        });

        it('should update menu item price', async () => {
            const response = await request(app)
                .patch(`/api/menu-items/${menuItemId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ price: 175 })
                .expect(200);

            expect(response.body.menuItem.price).toBe(175);
        });
    });

    describe('Table Management', () => {
        it('should create a table with QR code', async () => {
            const tableData = {
                restaurant: restaurantId.toString(),
                number: 1,
                capacity: 4,
                location: 'Main Hall',
                type: 'Square',
                status: 'available'
            };

            const response = await request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(tableData)
                .expect(201);

            expect(response.body.message).toBe('Table created successfully');
            expect(response.body.table.qrCode).toBeTruthy();
            expect(response.body.table.qrCode).toContain('data:image');
            tableId = response.body.table._id;
        });

        it('should list all tables for restaurant', async () => {
            const response = await request(app)
                .get(`/api/tables/restaurant/${restaurantId}`)
                .expect(200);

            expect(response.body).toHaveProperty('tables');
            expect(response.body.tables.length).toBeGreaterThan(0);
        });

        it('should update table status', async () => {
            const response = await request(app)
                .patch(`/api/tables/${tableId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'occupied' })
                .expect(200);

            expect(response.body.table.status).toBe('occupied');
        });

        it('should get single table details', async () => {
            const response = await request(app)
                .get(`/api/tables/${tableId}`)
                .expect(200);

            expect(response.body).toHaveProperty('table');
            expect(response.body.table._id).toBe(tableId.toString());
        });
    });

    describe('Staff Management', () => {
        let staffUserId;
        let waiterRoleId;

        it('should create a waiter role if not exists', async () => {
            let waiterRole = await Role.findOne({ name: 'waiter' });
            if (!waiterRole) {
                waiterRole = await Role.create({
                    name: 'waiter',
                    description: 'Waiter Staff'
                });
            }
            waiterRoleId = waiterRole._id;
            expect(waiterRoleId).toBeTruthy();
        });

        it('should create a staff user', async () => {
            const staffData = {
                name: 'Waiter Test',
                email: randomEmail(),
                password: 'Waiter@123',
                phone: randomPhone(),
                role: 'waiter'
            };

            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(staffData)
                .expect(201);

            expect(response.body.message).toBe('User created successfully');
            staffUserId = response.body.user._id;
        });

        it('should assign role to staff member', async () => {
            await UserRestaurantRole.create({
                user: staffUserId,
                restaurant: restaurantId,
                role: waiterRoleId,
                active: true,
                isDefault: true
            });

            const roleAssignment = await UserRestaurantRole.findOne({
                user: staffUserId,
                restaurant: restaurantId
            });

            expect(roleAssignment).toBeTruthy();
            expect(roleAssignment.role.toString()).toBe(waiterRoleId.toString());
        });

        it('should list all staff members', async () => {
            const response = await request(app)
                .get(`/api/users/restaurant/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
        });
    });

    describe('Coupon Management', () => {
        let couponId;

        it('should create a percentage discount coupon', async () => {
            const couponData = {
                code: 'SUMMER20',
                discountType: 'percentage',
                discountValue: 20,
                minOrderAmount: 100,
                maxDiscount: 200,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                usageLimit: 100
            };

            const response = await request(app)
                .post('/api/coupons')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(couponData)
                .expect(201);

            expect(response.body.message).toBe('Coupon created successfully');
            expect(response.body.coupon.code).toBe(couponData.code);
            couponId = response.body.coupon._id;
        });

        it('should create a fixed amount discount coupon', async () => {
            const couponData = {
                code: 'FIXED50',
                discountType: 'fixed',
                discountValue: 50,
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
        });

        it('should list all coupons for restaurant', async () => {
            const response = await request(app)
                .get(`/api/coupons/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('coupons');
            expect(response.body.coupons.length).toBeGreaterThan(0);
        });

        it('should deactivate a coupon', async () => {
            const response = await request(app)
                .delete(`/api/coupons/${couponId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body.message).toBe('Coupon deactivated successfully');
        });
    });

    describe('Subscription Management', () => {
        it('should view subscription status', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('subscription');
            expect(response.body.subscription.status).toBe('active');
        });

        it('should view subscription payment history', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${restaurantId}/history`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });
    });

    describe('Waiter Call System', () => {
        let waiterCallId;

        beforeAll(async () => {
            // Create a waiter call for testing
            const waiterCall = await WaiterCall.create({
                restaurant: restaurantId,
                table: tableId,
                type: 'service',
                status: 'pending',
                message: 'Need assistance'
            });
            waiterCallId = waiterCall._id;
        });

        it('should receive waiter calls', async () => {
            const response = await request(app)
                .get(`/api/waiter-calls/restaurant/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('calls');
            expect(Array.isArray(response.body.calls)).toBe(true);
        });

        it('should respond to waiter call', async () => {
            const response = await request(app)
                .patch(`/api/waiter-calls/${waiterCallId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'acknowledged' })
                .expect(200);

            expect(response.body.call.status).toBe('acknowledged');
        });
    });

    describe('Analytics and Reports', () => {
        it('should get sales analytics', async () => {
            const response = await request(app)
                .get(`/api/analytics/sales/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString()
                })
                .expect(200);

            expect(response.body).toHaveProperty('analytics');
        });

        it('should get popular items report', async () => {
            const response = await request(app)
                .get(`/api/analytics/popular-items/${restaurantId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('items');
        });
    });
});
