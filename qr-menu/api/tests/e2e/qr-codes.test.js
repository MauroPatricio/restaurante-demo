import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { randomEmail, randomPhone } from '../helpers/utils.js';
import User from '../../src/models/User.js';
import Restaurant from '../../src/models/Restaurant.js';
import Table from '../../src/models/Table.js';
import UserRestaurantRole from '../../src/models/UserRestaurantRole.js';
import Role from '../../src/models/Role.js';

describe('QR Codes and Tables E2E Tests', () => {
    let authToken;
    let restaurantId;
    let userId;

    beforeAll(async () => {
        // Create test user FIRST
        const userData = {
            name: 'QR Test Owner',
            email: randomEmail(),
            password: 'Test@1234',
            phone: randomPhone(),
        };

        const user = await User.create(userData);
        userId = user._id;

        // Create test restaurant WITH OWNER
        const restaurant = await Restaurant.create({
            name: 'Test Restaurant QR',
            email: randomEmail(),
            phone: randomPhone(),
            address: 'Test Address',
            currency: 'MZN',
            timezone: 'Africa/Maputo',
            owner: userId  // Add owner field
        });
        restaurantId = restaurant._id;

        // Create subscription for restaurant to pass checkSubscription middleware
        const { createTestSubscription, updateRestaurantSubscription } = await import('../helpers/utils.js');
        const subscription = await createTestSubscription(restaurantId);
        await updateRestaurantSubscription(restaurantId, subscription._id);

        // Create role association
        let ownerRole = await Role.findOne({ name: 'owner' });
        if (!ownerRole) {
            ownerRole = await Role.create({ name: 'owner', description: 'Restaurant Owner' });
        }

        await UserRestaurantRole.create({
            user: userId,
            restaurant: restaurantId,
            role: ownerRole._id,
            active: true,
            isDefault: true
        });

        // Login
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: userData.email,
                password: userData.password
            });

        const selectResponse = await request(app)
            .post('/api/auth/select-restaurant')
            .set('Authorization', `Bearer ${loginResponse.body.token}`)
            .send({ restaurantId });

        authToken = selectResponse.body.token;
    });

    afterAll(async () => {
        // Cleanup
        await Table.deleteMany({ restaurant: restaurantId });
        await UserRestaurantRole.deleteMany({ user: userId });
        await Restaurant.deleteOne({ _id: restaurantId });
        await User.deleteOne({ _id: userId });
    });

    describe('POST /api/tables', () => {
        it('should create a table with QR code successfully', async () => {
            const tableData = {
                restaurant: restaurantId.toString(),
                number: 1,
                capacity: 4,
                location: 'Main Hall',
                type: 'Round'
            };

            const response = await request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${authToken}`)
                .send(tableData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Table created successfully');
            expect(response.body).toHaveProperty('table');
            expect(response.body.table.number).toBe(tableData.number);
            expect(response.body.table.qrCode).toBeTruthy();
            expect(response.body.table.qrCode).toContain('data:image');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .post('/api/tables')
                .send({
                    restaurant: restaurantId,
                    number: 2,
                    capacity: 4
                })
                .expect(401);
        });
    });

    describe('GET /api/tables/restaurant/:restaurantId', () => {
        beforeAll(async () => {
            // Create a test table
            await Table.create({
                restaurant: restaurantId,
                number: 10,
                capacity: 6,
                qrCode: 'test-qr-code'
            });
        });

        it('should get all tables for a restaurant', async () => {
            const response = await request(app)
                .get(`/api/tables/restaurant/${restaurantId}`)
                .expect(200);

            expect(response.body).toHaveProperty('tables');
            expect(Array.isArray(response.body.tables)).toBe(true);
            expect(response.body.tables.length).toBeGreaterThan(0);
        });
    });

    describe('DELETE /api/tables/:id', () => {
        let tableId;

        beforeAll(async () => {
            const table = await Table.create({
                restaurant: restaurantId,
                number: 99,
                capacity: 2,
                qrCode: 'delete-test-qr'
            });
            tableId = table._id;
        });

        it('should delete a table successfully', async () => {
            const response = await request(app)
                .delete(`/api/tables/${tableId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Table deleted successfully');

            // Verify it's deleted
            const deletedTable = await Table.findById(tableId);
            expect(deletedTable).toBeNull();
        });

        it('should fail without authentication', async () => {
            const table = await Table.create({
                restaurant: restaurantId,
                number: 100,
                capacity: 2,
                qrCode: 'test'
            });

            await request(app)
                .delete(`/api/tables/${table._id}`)
                .expect(401);
        });
    });
});
